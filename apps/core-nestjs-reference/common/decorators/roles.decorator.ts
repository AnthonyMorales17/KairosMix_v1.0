import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export enum Rol {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
  CLIENTE = 'CLIENTE',
}

export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
