import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';

// GET /api/v1/catalog/alergenos (Requiere sesión autenticada)
export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const alergenos = await prisma.alergeno.findMany({
    orderBy: { nombre: 'asc' },
  });

  return NextResponse.json(alergenos);
}
