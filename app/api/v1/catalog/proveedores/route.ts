import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { z } from 'zod';

const CreateProveedorSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es requerido' }),
  ruc: z
    .string()
    .regex(/^\d{10}(\d{3})?$/, { message: 'El RUC debe tener 10 o 13 dígitos numéricos' }),
  contacto: z.string().optional(),
});

// GET /api/v1/catalog/proveedores (ADMIN / VENDEDOR)
export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (!['ADMIN', 'VENDEDOR'].includes(authUser.rol)) {
    return NextResponse.json({ message: 'Permiso denegado. Requiere rol ADMIN o VENDEDOR' }, { status: 403 });
  }

  const proveedores = await prisma.proveedor.findMany({
    orderBy: { nombre: 'asc' },
  });

  return NextResponse.json(proveedores);
}

// POST /api/v1/catalog/proveedores (ADMIN / VENDEDOR)
export async function POST(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (!['ADMIN', 'VENDEDOR'].includes(authUser.rol)) {
    return NextResponse.json({ message: 'Permiso denegado. Requiere rol ADMIN o VENDEDOR' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parseResult = CreateProveedorSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { nombre, ruc, contacto } = parseResult.data;

    const existing = await prisma.proveedor.findUnique({
      where: { ruc },
    });

    if (existing) {
      return NextResponse.json({ message: `Ya existe un proveedor con RUC ${ruc}` }, { status: 409 });
    }

    const newProv = await prisma.proveedor.create({
      data: {
        nombre,
        ruc,
        contacto,
        activo: true,
      },
    });

    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'CREATE_PROVEEDOR',
          entidad: 'Proveedor',
          entidadId: String(newProv.id),
          payload: { nombre, ruc },
          resultado: 'EXITO',
        },
      });
    } catch (audErr: any) {
      console.error('Error registrando EventoAuditoria al crear proveedor:', audErr.message);
    }

    return NextResponse.json(newProv, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al crear proveedor' }, { status: 500 });
  }
}
