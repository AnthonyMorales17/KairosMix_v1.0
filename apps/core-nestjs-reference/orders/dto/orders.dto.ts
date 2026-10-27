import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutItemDto {
  @IsInt({ message: 'ingredienteId debe ser un número entero' })
  ingredienteId!: number;

  @IsNumber({}, { message: 'gramos debe ser numérico' })
  @IsPositive({ message: 'gramos debe ser mayor a 0' })
  gramos!: number;
}

export class CheckoutDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'El pedido debe contener al menos un ingrediente' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsIn(['TARJETA_CREDITO', 'PAYPHONE', 'TRANSFERENCIA'], {
    message: 'metodoPago debe ser TARJETA_CREDITO, PAYPHONE o TRANSFERENCIA',
  })
  metodoPago!: string;

  // Toggle solo para pruebas del flujo de compensación. Si en producción no
  // quieres que un cliente real pueda forzar un fallo de pago, restringe este
  // campo a un guard de rol ADMIN en el controller, o elimínalo del todo.
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}

// Reexportado directo del cliente de Prisma generado a partir del schema —
// evita mantener una copia manual que se puede desincronizar si el schema cambia.
export { EstadoPedido } from '@prisma/client';
