import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { LoginDto, RefreshTokenDto, CreateUserDto } from './dto/identity.dto';

@Injectable()
export class IdentityService {
  private readonly jwtSecret = process.env.JWT_SECRET || '';
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || '';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({ where: { email: loginDto.email } });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
    const rawRefreshToken = jwt.sign(payload, this.refreshSecret, { expiresIn: '7d' });
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        usuarioId: user.id,
        tokenHash,
        expiraEn,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    let decoded: any;
    try {
      decoded = jwt.verify(dto.refreshToken, this.refreshSecret);
    } catch {
      throw new UnauthorizedException('Refresh token expirado o inválido');
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        usuarioId: decoded.sub,
        expiraEn: { gt: new Date() },
      },
      orderBy: { creadoEn: 'desc' },
    });

    let validTokenRecord = null;
    for (const record of tokens) {
      const match = await bcrypt.compare(dto.refreshToken, record.tokenHash);
      if (match) {
        validTokenRecord = record;
        break;
      }
    }

    if (!validTokenRecord) {
      throw new UnauthorizedException('Refresh token no encontrado o revocado');
    }

    // Rotate: remove used refresh token
    await this.prisma.refreshToken.delete({ where: { id: validTokenRecord.id } });

    const user = await this.prisma.usuario.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no válido o inactivo');
    }

    const newPayload = { sub: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
    const newAccessToken = jwt.sign(newPayload, this.jwtSecret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign(newPayload, this.refreshSecret, { expiresIn: '7d' });
    const newTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        usuarioId: user.id,
        tokenHash: newTokenHash,
        expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    };
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El correo ya está registrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        passwordHash,
        nombre: dto.nombre,
        rol: dto.rol,
        activo: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      activo: user.activo,
      creadoEn: user.creadoEn,
    };
  }

  async listUsers() {
    return await this.prisma.usuario.findMany({
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
  }

  async toggleUserStatus(id: string, activo: boolean) {
    return await this.prisma.usuario.update({
      where: { id },
      data: { activo },
    });
  }
}
