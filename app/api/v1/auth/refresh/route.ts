import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, getJwtRefreshSecret } from '@/lib/server-auth';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token es requerido' }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = RefreshSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { refreshToken } = parseResult.data;
    const jwtRefreshSecret = getJwtRefreshSecret();
    const jwtSecret = getJwtSecret();

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, jwtRefreshSecret);
    } catch {
      return NextResponse.json({ message: 'Refresh token expirado o inválido' }, { status: 401 });
    }

    const incomingTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const validTokenRecord = await prisma.refreshToken.findFirst({
      where: {
        tokenHash: incomingTokenHash,
        usuarioId: decoded.sub,
        expiraEn: { gt: new Date() },
      },
    });

    if (!validTokenRecord) {
      return NextResponse.json({ message: 'Refresh token no encontrado o revocado' }, { status: 401 });
    }

    // Token rotation: delete old used token
    await prisma.refreshToken.delete({
      where: { id: validTokenRecord.id },
    });

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || !user.activo) {
      return NextResponse.json({ message: 'Usuario no activo o no encontrado' }, { status: 401 });
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
    const newAccessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        usuarioId: user.id,
        tokenHash: newTokenHash,
        expiraEn: new Date(Date.now() + 7 * 24 * 3600000),
      },
    });

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al refrescar token' }, { status: 500 });
  }
}
