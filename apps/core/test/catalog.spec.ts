import { CatalogService } from '../src/catalog/catalog.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriaIngrediente, OrigenIngrediente } from '../src/catalog/dto/catalog.dto';

describe('CatalogService (Unit Tests)', () => {
  let catalogService: CatalogService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      ingrediente: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stock: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      ingredienteAlergeno: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      proveedor: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      alergeno: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(mockPrisma)),
    };
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    catalogService = new CatalogService(mockPrisma, mockRedis);
  });

  it('debe listar ingredientes activos y filtrar alérgenos', async () => {
    const mockData = [
      { id: 1, nombre: 'Almendra', activo: true, alergenos: [{ alergenoId: 1 }] },
      { id: 2, nombre: 'Arándano', activo: true, alergenos: [] },
    ];
    mockPrisma.ingrediente.findMany.mockResolvedValue(mockData);

    const result = await catalogService.listIngredientes({ excluirAlergenoId: 1 });
    expect(result.length).toBe(1);
    expect(result[0].nombre).toBe('Arándano');
  });

  it('debe realizar soft-delete (activo = false) y nunca borrado físico', async () => {
    mockPrisma.ingrediente.findUnique.mockResolvedValue({ id: 1, nombre: 'Nuez', activo: true });
    mockPrisma.ingrediente.update.mockResolvedValue({ id: 1, nombre: 'Nuez', activo: false });

    await catalogService.deactivateIngrediente(1);

    expect(mockPrisma.ingrediente.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ activo: false }),
    });
  });

  it('debe crear un nuevo proveedor con RUC único', async () => {
    mockPrisma.proveedor.findUnique.mockResolvedValue(null);
    mockPrisma.proveedor.create.mockResolvedValue({
      id: 1,
      nombre: 'Distribuidora Andina',
      ruc: '1792345678001',
      activo: true,
    });

    const prov = await catalogService.createProveedor({
      nombre: 'Distribuidora Andina',
      ruc: '1792345678001',
      contacto: 'ventas@andina.com',
    });

    expect(prov.ruc).toBe('1792345678001');
    expect(mockPrisma.proveedor.create).toHaveBeenCalled();
  });
});
