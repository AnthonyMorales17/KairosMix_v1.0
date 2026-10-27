import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';

// GET /api/v1/notifications/logs (ADMIN / VENDEDOR)
export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (!['ADMIN', 'VENDEDOR'].includes(authUser.rol)) {
    return NextResponse.json({ message: 'Permiso denegado. Requiere rol ADMIN o VENDEDOR' }, { status: 403 });
  }

  const logs = await prisma.notificacionLog.findMany({
    orderBy: { enviadaEn: 'desc' },
    take: 100,
  });

  return NextResponse.json(logs);
}
