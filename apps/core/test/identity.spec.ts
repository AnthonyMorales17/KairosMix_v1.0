import { IdentityService } from '../src/identity/identity.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('IdentityService (Unit Tests)', () => {
  let identityService: IdentityService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    identityService = new IdentityService(mockPrisma, mockRedis);
  });

  it('debe registrar el usuario admin inicial en seedAdmin si no existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({
      id: 'admin-uuid-1',
      email: 'admin@kairosmix.com',
      rol: 'ADMIN',
      nombre: 'Administrador Principal KairosMix',
    });

    const result = await identityService.seedAdmin();
    expect(result.email).toBe('admin@kairosmix.com');
    expect(result.rol).toBe('ADMIN');
    expect(mockPrisma.usuario.create).toHaveBeenCalled();
  });

  it('debe autenticar exitosamente y retornar access & refresh tokens', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 10);

    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'cliente@kairosmix.com',
      passwordHash,
      nombre: 'Cliente Test',
      rol: 'CLIENTE',
      activo: true,
    });
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const response = await identityService.login({
      email: 'cliente@kairosmix.com',
      password: 'Password123!',
    });

    expect(response).toHaveProperty('accessToken');
    expect(response).toHaveProperty('refreshToken');
    expect(response.user.email).toBe('cliente@kairosmix.com');
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
  });

  it('debe lanzar UnauthorizedException ante contraseña incorrecta', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword!', 10);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'cliente@kairosmix.com',
      passwordHash,
      activo: true,
    });

    await expect(
      identityService.login({
        email: 'cliente@kairosmix.com',
        password: 'WrongPassword!',
      })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe crear un nuevo usuario con rol asignado', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({
      id: 'vendedor-uuid-1',
      email: 'vendedor@kairosmix.com',
      nombre: 'Vendedor Store',
      rol: 'VENDEDOR',
      activo: true,
      creadoEn: new Date(),
    });

    const newUser = await identityService.createUser({
      email: 'vendedor@kairosmix.com',
      password: 'Password123!',
      nombre: 'Vendedor Store',
      rol: 'VENDEDOR',
    });

    expect(newUser.rol).toBe('VENDEDOR');
    expect(newUser.email).toBe('vendedor@kairosmix.com');
  });
});
