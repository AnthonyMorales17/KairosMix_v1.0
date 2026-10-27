import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export function getJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('La variable de entorno JWT_SECRET no está definida.');
  }
  return JWT_SECRET;
}

export function getJwtRefreshSecret(): string {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('La variable de entorno JWT_REFRESH_SECRET no está definida.');
  }
  return JWT_REFRESH_SECRET;
}

export function verifyAuthToken(req: NextRequest): { id: string; email: string; rol: string; nombre: string } | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as any;
    return {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      rol: decoded.rol,
      nombre: decoded.nombre,
    };
  } catch {
    return null;
  }
}

// Seed Admin
export async function handleSeedAdmin() {
  const adminEmail = 'admin@kairosmix.com';
  const existing = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    const { passwordHash: _, ...safeExisting } = existing;
    return NextResponse.json({ message: 'Usuario admin ya inicializado', user: safeExisting });
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ message: 'SEED_ADMIN_PASSWORD no está configurada' }, { status: 500 });
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const newAdmin = await prisma.usuario.create({
    data: {
      email: adminEmail,
      passwordHash,
      nombre: 'Administrador Principal KairosMix',
      rol: 'ADMIN',
      activo: true,
    },
  });

  const { passwordHash: _, ...safeAdmin } = newAdmin;
  return NextResponse.json({ message: 'Admin creado exitosamente', user: safeAdmin }, { status: 201 });
}
