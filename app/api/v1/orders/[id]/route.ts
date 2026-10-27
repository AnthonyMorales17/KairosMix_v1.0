import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';

// GET /api/v1/orders/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          pedido: false,
        },
      },
      factura: true,
    },
  });

  if (!pedido) {
    return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
  }

  // Verificación de propiedad (CLIENTE solo ve su propio pedido)
  if (authUser.rol === 'CLIENTE' && pedido.clienteId !== authUser.id) {
    return NextResponse.json({ message: 'No tienes permiso para ver este pedido' }, { status: 403 });
  }

  const cliente = await prisma.usuario.findUnique({
    where: { id: pedido.clienteId },
    select: { id: true, nombre: true, email: true },
  });

  return NextResponse.json({
    ...pedido,
    cliente,
  });
}
