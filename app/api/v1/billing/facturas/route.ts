import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';

// GET /api/v1/billing/facturas
export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const where: any = {};
  if (authUser.rol === 'CLIENTE') {
    where.pedido = { clienteId: authUser.id };
  }

  const facturas = await prisma.factura.findMany({
    where,
    include: {
      pedido: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { emitidaEn: 'desc' },
  });

  return NextResponse.json(facturas);
}
