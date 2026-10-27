import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autorización no proporcionado o inválido');
    }

    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new UnauthorizedException('JWT_SECRET no está configurada');
      const decoded = jwt.verify(token, secret) as any;
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
