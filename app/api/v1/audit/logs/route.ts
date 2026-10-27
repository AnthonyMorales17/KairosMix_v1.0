import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';

// GET /api/v1/audit/logs (ADMIN solo)
export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (authUser.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Requiere rol ADMIN' }, { status: 403 });
  }

  const logs = await prisma.eventoAuditoria.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return NextResponse.json(logs);
}
