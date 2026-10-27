import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { Rol } from '@prisma/client';

export class LoginDto {
  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  email!: string;

  // Sin MinLength aquí a propósito: esta es la validación de LOGIN, no de
  // creación de cuenta — no queremos rechazar el login de una cuenta antigua
  // si algún día cambia la política de longitud mínima.
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'refreshToken es requerido' })
  refreshToken!: string;
}

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre!: string;

  @IsEnum(Rol, { message: 'rol debe ser ADMIN, VENDEDOR o CLIENTE' })
  rol!: Rol;
}

// Reexportado desde @prisma/client para no duplicar el enum a mano.
export { Rol };