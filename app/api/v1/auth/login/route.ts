import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, getJwtRefreshSecret } from '@/lib/server-auth';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email({ message: 'El correo electrónico debe tener un formato válido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.activo) {
      return NextResponse.json({ message: 'Credenciales inválidas o cuenta desactivada' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    const jwtSecret = getJwtSecret();
    const jwtRefreshSecret = getJwtRefreshSecret();

    const payload = { sub: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
    const rawRefreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const expiraEn = new Date(Date.now() + 7 * 24 * 3600000);

    await prisma.refreshToken.create({
      data: {
        usuarioId: user.id,
        tokenHash,
        expiraEn,
      },
    });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error en autenticación' }, { status: 500 });
  }
}
