import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { z } from 'zod';

const UpdateStockSchema = z.object({
  ingredienteId: z.number().int({ message: 'ingredienteId debe ser un número entero' }),
  gramosDisponibles: z.number().min(0, { message: 'gramosDisponibles debe ser mayor o igual a 0' }),
});

// POST /api/v1/catalog/stock (ADMIN / VENDEDOR) - Canal exclusivo de modificación de stock
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
    const parseResult = UpdateStockSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { ingredienteId, gramosDisponibles } = parseResult.data;

    const ing = await prisma.ingrediente.findUnique({ where: { id: ingredienteId } });
    if (!ing) {
      return NextResponse.json({ message: 'Ingrediente no encontrado' }, { status: 404 });
    }

    const currentStock = await prisma.stock.findUnique({ where: { ingredienteId } });

    const updatedStock = await prisma.stock.upsert({
      where: { ingredienteId },
      update: { gramosDisponibles },
      create: { ingredienteId, gramosDisponibles },
    });

    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'UPDATE_STOCK',
          entidad: 'Stock',
          entidadId: String(ingredienteId),
          payload: {
            ingrediente: ing.nombre,
            anterior: currentStock?.gramosDisponibles ?? 0,
            nuevo: gramosDisponibles,
          },
          resultado: 'EXITO',
        },
      });
    } catch (audErr: any) {
      console.error('Error registrando EventoAuditoria al actualizar stock:', audErr.message);
    }

    return NextResponse.json(updatedStock);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al actualizar stock' }, { status: 500 });
  }
}
