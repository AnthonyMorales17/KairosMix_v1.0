import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { CreateIngredienteDto, UpdateIngredienteDto, CreateProveedorDto, UpdateProveedorDto, UpdateStockDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  private readonly CACHE_KEY_INGREDIENTES = 'catalog:ingredientes:all';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async listIngredientes(filters?: {
    categoria?: string;
    excluirAlergenoId?: number;
    soloActivos?: boolean;
    busqueda?: string;
  }) {
    const where: any = {};
    if (filters?.soloActivos !== false) {
      where.activo = true;
    }
    if (filters?.categoria) {
      where.categoria = filters.categoria;
    }
    if (filters?.busqueda) {
      where.nombre = { contains: filters.busqueda, mode: 'insensitive' };
    }
    if (filters?.excluirAlergenoId) {
      where.alergenos = { none: { alergenoId: Number(filters.excluirAlergenoId) } };
    }

    return await this.prisma.ingrediente.findMany({
      where,
      include: {
        alergenos: {
          include: {
            alergeno: true,
          },
        },
        stock: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getIngredienteById(id: number) {
    const ingrediente = await this.prisma.ingrediente.findUnique({
      where: { id },
      include: {
        alergenos: {
          include: { alergeno: true },
        },
        stock: true,
      },
    });
    if (!ingrediente) {
      throw new NotFoundException(`Ingrediente con ID ${id} no encontrado`);
    }
    return ingrediente;
  }

  async createIngrediente(dto: CreateIngredienteDto) {
    const existing = await this.prisma.ingrediente.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existing) {
      throw new ConflictException(`El ingrediente con nombre "${dto.nombre}" ya existe.`);
    }

    const result = await this.prisma.$transaction(async (tx: any) => {
      const ingrediente = await tx.ingrediente.create({
        data: {
          nombre: dto.nombre,
          categoria: dto.categoria,
          fdcId: dto.fdcId,
          caloriasPor100g: dto.caloriasPor100g,
          proteinasG100g: dto.proteinasG100g,
          grasasG100g: dto.grasasG100g,
          carbohidratosG100g: dto.carbohidratosG100g,
          fibraG100g: dto.fibraG100g ?? 0,
          azucaresG100g: dto.azucaresG100g ?? 0,
          sodioMg100g: dto.sodioMg100g ?? 0,
          origen: dto.origen,
          esProcesado: dto.esProcesado ?? false,
          precioPorGramo: dto.precioPorGramo ?? 0.05,
          activo: true,
        },
      });

      // Initialize stock
      await tx.stock.create({
        data: {
          ingredienteId: ingrediente.id,
          gramosDisponibles: dto.stockInicialGramos ?? 1000,
        },
      });

      // Add allergen links if any
      if (dto.alergenos && dto.alergenos.length > 0) {
        for (const al of dto.alergenos) {
          await tx.ingredienteAlergeno.create({
            data: {
              ingredienteId: ingrediente.id,
              alergenoId: al.alergenoId,
              nivel: al.nivel,
            },
          });
        }
      }

      return ingrediente;
    });

    await this.redis.del(this.CACHE_KEY_INGREDIENTES);
    return this.getIngredienteById(result.id);
  }

  async updateIngrediente(id: number, dto: UpdateIngredienteDto) {
    const existing = await this.prisma.ingrediente.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Ingrediente con ID ${id} no encontrado`);
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.ingrediente.update({
        where: { id },
        data: {
          nombre: dto.nombre,
          categoria: dto.categoria,
          fdcId: dto.fdcId,
          caloriasPor100g: dto.caloriasPor100g,
          proteinasG100g: dto.proteinasG100g,
          grasasG100g: dto.grasasG100g,
          carbohidratosG100g: dto.carbohidratosG100g,
          fibraG100g: dto.fibraG100g,
          azucaresG100g: dto.azucaresG100g,
          sodioMg100g: dto.sodioMg100g,
          origen: dto.origen,
          esProcesado: dto.esProcesado,
          precioPorGramo: dto.precioPorGramo,
          activo: dto.activo,
        },
      });

      if (dto.alergenos !== undefined) {
        await tx.ingredienteAlergeno.deleteMany({ where: { ingredienteId: id } });
        for (const al of dto.alergenos) {
          await tx.ingredienteAlergeno.create({
            data: {
              ingredienteId: id,
              alergenoId: al.alergenoId,
              nivel: al.nivel,
            },
          });
        }
      }
    });

    await this.redis.del(this.CACHE_KEY_INGREDIENTES);
    return this.getIngredienteById(id);
  }

  async deactivateIngrediente(id: number) {
    return await this.updateIngrediente(id, { activo: false });
  }

  async updateStock(dto: UpdateStockDto) {
    const stock = await this.prisma.stock.upsert({
      where: { ingredienteId: dto.ingredienteId },
      update: { gramosDisponibles: dto.gramosDisponibles },
      create: { ingredienteId: dto.ingredienteId, gramosDisponibles: dto.gramosDisponibles },
    });
    await this.redis.del(this.CACHE_KEY_INGREDIENTES);
    return stock;
  }

  // Proveedores
  async listProveedores() {
    return await this.prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async createProveedor(dto: CreateProveedorDto) {
    const existing = await this.prisma.proveedor.findUnique({ where: { ruc: dto.ruc } });
    if (existing) {
      throw new ConflictException(`Ya existe un proveedor con RUC ${dto.ruc}`);
    }
    return await this.prisma.proveedor.create({
      data: {
        nombre: dto.nombre,
        ruc: dto.ruc,
        contacto: dto.contacto,
        activo: true,
      },
    });
  }

  async updateProveedor(id: number, dto: UpdateProveedorDto) {
    const existing = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    if (dto.ruc && dto.ruc !== existing.ruc) {
      const rucDuplicate = await this.prisma.proveedor.findFirst({
        where: { ruc: dto.ruc, NOT: { id } },
      });
      if (rucDuplicate) {
        throw new ConflictException(`Ya existe otro proveedor con el RUC ${dto.ruc}`);
      }
    }

    return await this.prisma.proveedor.update({
      where: { id },
      data: dto,
    });
  }

  async listAlergenos() {
    return await this.prisma.alergeno.findMany({
      orderBy: { nombre: 'asc' },
    });
  }
}
