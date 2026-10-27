import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';

// GET /api/v1/orders (Fail-Closed por rol)
export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const where: any = {};
  // Fail-closed: Cualquier usuario que no sea explícitamente ADMIN o VENDEDOR se filtra por su propio clienteId
  if (authUser.rol !== 'ADMIN' && authUser.rol !== 'VENDEDOR') {
    where.clienteId = authUser.id;
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    include: {
      items: true,
      factura: true,
    },
    orderBy: { creadoEn: 'desc' },
  });

  return NextResponse.json(pedidos);
}
