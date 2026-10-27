import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { z } from 'zod';

const UpdateProveedorSchema = z.object({
  nombre: z.string().min(1).optional(),
  ruc: z
    .string()
    .regex(/^\d{10}(\d{3})?$/, { message: 'El RUC debe tener 10 o 13 dígitos numéricos' })
    .optional(),
  contacto: z.string().optional(),
  activo: z.boolean().optional(),
});

// PATCH /api/v1/catalog/proveedores/[id] (ADMIN / VENDEDOR)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (!['ADMIN', 'VENDEDOR'].includes(authUser.rol)) {
    return NextResponse.json({ message: 'Permiso denegado' }, { status: 403 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) {
    return NextResponse.json({ message: 'ID de proveedor inválido' }, { status: 400 });
  }

  // 1. Validar existencia del proveedor (404 si no existe)
  const existing = await prisma.proveedor.findUnique({ where: { id: numId } });
  if (!existing) {
    return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parseResult = UpdateProveedorSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // 2. Validar unicidad del RUC frente a otros proveedores (409 si colisiona)
    if (data.ruc && data.ruc !== existing.ruc) {
      const rucDuplicate = await prisma.proveedor.findFirst({
        where: { ruc: data.ruc, NOT: { id: numId } },
      });
      if (rucDuplicate) {
        return NextResponse.json({ message: `Ya existe otro proveedor con el RUC ${data.ruc}` }, { status: 409 });
      }
    }

    const updated = await prisma.proveedor.update({
      where: { id: numId },
      data,
    });

    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'UPDATE_PROVEEDOR',
          entidad: 'Proveedor',
          entidadId: String(numId),
          payload: data,
          resultado: 'EXITO',
        },
      });
    } catch (audErr: any) {
      console.error('Error registrando EventoAuditoria al actualizar proveedor:', audErr.message);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al actualizar proveedor' }, { status: 500 });
  }
}
