import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { z } from 'zod';
import { CategoriaIngrediente, OrigenIngrediente, NivelAlergeno } from '@prisma/client';

const AlergenoItemSchema = z.object({
  alergenoId: z.number().int({ message: 'alergenoId debe ser entero' }),
  nivel: z.nativeEnum(NivelAlergeno).optional().default(NivelAlergeno.CONTIENE),
});

const UpdateIngredienteSchema = z.object({
  nombre: z.string().min(1).optional(),
  categoria: z.nativeEnum(CategoriaIngrediente).optional(),
  fdcId: z.number().int().optional(),
  caloriasPor100g: z.number().min(0).optional(),
  proteinasG100g: z.number().min(0).optional(),
  grasasG100g: z.number().min(0).optional(),
  carbohidratosG100g: z.number().min(0).optional(),
  fibraG100g: z.number().min(0).optional(),
  azucaresG100g: z.number().min(0).optional(),
  sodioMg100g: z.number().min(0).optional(),
  origen: z.nativeEnum(OrigenIngrediente).optional(),
  esProcesado: z.boolean().optional(),
  precioPorGramo: z.number().positive({ message: 'El precio por gramo debe ser mayor a 0' }).optional(),
  activo: z.boolean().optional(),
  alergenos: z.array(AlergenoItemSchema).optional(),
});

// GET /api/v1/catalog/ingredientes/[id] (Requiere autenticación)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) {
    return NextResponse.json({ message: 'ID de ingrediente inválido' }, { status: 400 });
  }

  const ing = await prisma.ingrediente.findUnique({
    where: { id: numId },
    include: {
      stock: true,
      alergenos: {
        include: { alergeno: true },
      },
    },
  });

  if (!ing) {
    return NextResponse.json({ message: 'Ingrediente no encontrado' }, { status: 404 });
  }

  return NextResponse.json(ing);
}

// PUT /api/v1/catalog/ingredientes/[id] (ADMIN / VENDEDOR) - NOTA: NUNCA modifica el stock
export async function PUT(
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
    return NextResponse.json({ message: 'ID de ingrediente inválido' }, { status: 400 });
  }

  const existing = await prisma.ingrediente.findUnique({ where: { id: numId } });
  if (!existing) {
    return NextResponse.json({ message: 'Ingrediente no encontrado' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parseResult = UpdateIngredienteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Actualización transaccional del ingrediente y alérgenos (SIN TOCAR STOCK)
    await prisma.$transaction(async (tx) => {
      await tx.ingrediente.update({
        where: { id: numId },
        data: {
          nombre: data.nombre,
          categoria: data.categoria,
          fdcId: data.fdcId,
          caloriasPor100g: data.caloriasPor100g,
          proteinasG100g: data.proteinasG100g,
          grasasG100g: data.grasasG100g,
          carbohidratosG100g: data.carbohidratosG100g,
          fibraG100g: data.fibraG100g,
          azucaresG100g: data.azucaresG100g,
          sodioMg100g: data.sodioMg100g,
          origen: data.origen,
          esProcesado: data.esProcesado,
          precioPorGramo: data.precioPorGramo,
          activo: data.activo,
        },
      });

      if (data.alergenos !== undefined) {
        await tx.ingredienteAlergeno.deleteMany({ where: { ingredienteId: numId } });
        for (const al of data.alergenos) {
          await tx.ingredienteAlergeno.create({
            data: {
              ingredienteId: numId,
              alergenoId: al.alergenoId,
              nivel: al.nivel,
            },
          });
        }
      }
    });

    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'UPDATE_INGREDIENTE',
          entidad: 'Ingrediente',
          entidadId: String(numId),
          payload: data,
          resultado: 'EXITO',
        },
      });
    } catch (audErr: any) {
      console.error('Error registrando EventoAuditoria al actualizar ingrediente:', audErr.message);
    }

    const updated = await prisma.ingrediente.findUnique({
      where: { id: numId },
      include: {
        stock: true,
        alergenos: { include: { alergeno: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al actualizar ingrediente' }, { status: 500 });
  }
}

// DELETE /api/v1/catalog/ingredientes/[id] (Soft Delete -> activo = false, NUNCA borrado físico)
export async function DELETE(
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
    return NextResponse.json({ message: 'ID de ingrediente inválido' }, { status: 400 });
  }

  const ing = await prisma.ingrediente.findUnique({ where: { id: numId } });
  if (!ing) {
    return NextResponse.json({ message: 'Ingrediente no encontrado' }, { status: 404 });
  }

  const deactivated = await prisma.ingrediente.update({
    where: { id: numId },
    data: { activo: false },
  });

  try {
    await prisma.eventoAuditoria.create({
      data: {
        usuarioId: authUser.id,
        accion: 'SOFT_DELETE_INGREDIENTE',
        entidad: 'Ingrediente',
        entidadId: String(numId),
        payload: { activo: false, motivo: 'Desactivación lógica' },
        resultado: 'EXITO',
      },
    });
  } catch (audErr: any) {
    console.error('Error registrando EventoAuditoria al desactivar ingrediente:', audErr.message);
  }

  return NextResponse.json({ message: `Ingrediente "${deactivated.nombre}" desactivado exitosamente`, ingrediente: deactivated });
}
