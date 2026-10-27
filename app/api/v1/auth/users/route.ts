import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email({ message: 'El correo electrónico debe ser válido' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
  nombre: z.string().min(1, { message: 'El nombre es obligatorio' }),
  rol: z.enum(['ADMIN', 'VENDEDOR', 'CLIENTE'], { message: 'El rol debe ser ADMIN, VENDEDOR o CLIENTE' }),
});

// GET /api/v1/auth/users (ADMIN only)
export async function GET(req: NextRequest) {
  const user = verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Requiere rol ADMIN' }, { status: 403 });
  }

  const users = await prisma.usuario.findMany({
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      activo: true,
      creadoEn: true,
    },
    orderBy: { creadoEn: 'desc' },
  });

  return NextResponse.json(users);
}

// POST /api/v1/auth/users (ADMIN only)
export async function POST(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (authUser.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Solo el ADMIN puede crear nuevos usuarios' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parseResult = CreateUserSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, nombre, rol } = parseResult.data;

    const existing = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.usuario.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        nombre,
        rol,
        activo: true,
      },
    });

    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'CREATE_USER',
          entidad: 'Usuario',
          entidadId: newUser.id,
          payload: { email: newUser.email, rol: newUser.rol, nombre: newUser.nombre },
          resultado: 'EXITO',
        },
      });
    } catch (audErr: any) {
      console.error('Error registrando EventoAuditoria al crear usuario:', audErr.message);
    }

    const { passwordHash: _, ...safeUser } = newUser;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al crear usuario' }, { status: 500 });
  }
}
