import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { z } from 'zod';
import { CategoriaIngrediente, OrigenIngrediente, NivelAlergeno } from '@prisma/client';

const AlergenoItemSchema = z.object({
  alergenoId: z.number().int({ message: 'alergenoId debe ser un entero' }),
  nivel: z.nativeEnum(NivelAlergeno).optional().default(NivelAlergeno.CONTIENE),
});

const CreateIngredienteSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es obligatorio' }),
  categoria: z.nativeEnum(CategoriaIngrediente, { message: 'Categoría inválida' }),
  fdcId: z.number().int().optional(),
  caloriasPor100g: z.number().min(0, { message: 'Las calorías deben ser mayores o iguales a 0' }),
  proteinasG100g: z.number().min(0, { message: 'Las proteínas deben ser mayores o iguales a 0' }),
  grasasG100g: z.number().min(0, { message: 'Las grasas deben ser mayores o iguales a 0' }),
  carbohidratosG100g: z.number().min(0, { message: 'Los carbohidratos deben ser mayores o iguales a 0' }),
  fibraG100g: z.number().min(0).optional().default(0),
  azucaresG100g: z.number().min(0).optional().default(0),
  sodioMg100g: z.number().min(0).optional().default(0),
  origen: z.nativeEnum(OrigenIngrediente).optional().default(OrigenIngrediente.VEGETAL),
  esProcesado: z.boolean().optional().default(false),
  precioPorGramo: z.number().positive({ message: 'El precio por gramo es obligatorio y debe ser mayor a 0' }),
  stockInicialGramos: z.number().min(0).optional().default(1000),
  alergenos: z.array(AlergenoItemSchema).optional().default([]),
});

// GET /api/v1/catalog/ingredientes (Requiere sesión autenticada)
export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get('categoria');
  const excluirAlergenoId = searchParams.get('excluirAlergenoId');
  const soloActivos = searchParams.get('soloActivos') !== 'false';
  const busqueda = searchParams.get('busqueda');

  const where: any = {};
  if (soloActivos) {
    where.activo = true;
  }
  if (categoria && Object.values(CategoriaIngrediente).includes(categoria as CategoriaIngrediente)) {
    where.categoria = categoria as CategoriaIngrediente;
  }
  if (busqueda) {
    where.nombre = { contains: busqueda, mode: 'insensitive' };
  }
  if (excluirAlergenoId && !isNaN(Number(excluirAlergenoId))) {
    where.alergenos = { none: { alergenoId: Number(excluirAlergenoId) } };
  }

  const ingredientes = await prisma.ingrediente.findMany({
    where,
    include: {
      stock: true,
      alergenos: {
        include: {
          alergeno: true,
        },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  return NextResponse.json(ingredientes);
}

// POST /api/v1/catalog/ingredientes (ADMIN / VENDEDOR)
export async function POST(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (!['ADMIN', 'VENDEDOR'].includes(authUser.rol)) {
    return NextResponse.json({ message: 'Permiso denegado. Requiere rol ADMIN o VENDEDOR' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parseResult = CreateIngredienteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const existing = await prisma.ingrediente.findUnique({
      where: { nombre: data.nombre },
    });

    if (existing) {
      return NextResponse.json({ message: `El ingrediente con nombre "${data.nombre}" ya existe.` }, { status: 409 });
    }

    const newIngrediente = await prisma.$transaction(async (tx) => {
      const ing = await tx.ingrediente.create({
        data: {
          nombre: data.nombre,
          categoria: data.categoria,
          fdcId: data.fdcId,
          caloriasPor100g: data.caloriasPor100g,
          proteinasG100g: data.proteinasG100g,
          grasasG100g: data.grasasG100g,
          carbohidratosG100g: data.carbohidratosG100g,
          fibraG100g: data.fibraG100g,
          azucaresG100g: data.azucaresG100g,
          sodioMg100g: data.sodioMg100g,
          origen: data.origen,
          esProcesado: data.esProcesado,
          precioPorGramo: data.precioPorGramo,
          activo: true,
        },
      });

      await tx.stock.create({
        data: {
          ingredienteId: ing.id,
          gramosDisponibles: data.stockInicialGramos,
        },
      });

      if (data.alergenos && data.alergenos.length > 0) {
        for (const al of data.alergenos) {
          await tx.ingredienteAlergeno.create({
            data: {
              ingredienteId: ing.id,
              alergenoId: al.alergenoId,
              nivel: al.nivel,
            },
          });
        }
      }

      return ing;
    });

    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'CREATE_INGREDIENTE',
          entidad: 'Ingrediente',
          entidadId: String(newIngrediente.id),
          payload: { nombre: data.nombre, categoria: data.categoria, precioPorGramo: data.precioPorGramo },
          resultado: 'EXITO',
        },
      });
    } catch (audErr: any) {
      console.error('Error registrando EventoAuditoria al crear ingrediente:', audErr.message);
    }

    const fullIngrediente = await prisma.ingrediente.findUnique({
      where: { id: newIngrediente.id },
      include: {
        stock: true,
        alergenos: { include: { alergeno: true } },
      },
    });

    return NextResponse.json(fullIngrediente, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al crear ingrediente' }, { status: 500 });
  }
}
