import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { z } from 'zod';

const ToggleStatusSchema = z.object({
  activo: z.boolean({ message: 'El campo activo es obligatorio y debe ser un booleano' }),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (authUser.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Requiere rol ADMIN' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parseResult = ToggleStatusSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { activo } = parseResult.data;

  const user = await prisma.usuario.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
  }

  if (user.id === authUser.id && activo === false) {
    return NextResponse.json({ message: 'No puedes desactivar tu propia cuenta de administrador' }, { status: 400 });
  }

  const updatedUser = await prisma.usuario.update({
    where: { id },
    data: { activo },
  });

  try {
    await prisma.eventoAuditoria.create({
      data: {
        usuarioId: authUser.id,
        accion: 'TOGGLE_USER_STATUS',
        entidad: 'Usuario',
        entidadId: user.id,
        payload: { activo },
        resultado: 'EXITO',
      },
    });
  } catch (audErr: any) {
    console.error('Error registrando EventoAuditoria al cambiar estado de usuario:', audErr.message);
  }

  const { passwordHash, ...safeUser } = updatedUser;
  return NextResponse.json(safeUser);
}
