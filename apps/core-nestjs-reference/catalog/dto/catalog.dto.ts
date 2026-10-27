import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsPositive,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CategoriaIngrediente,
  OrigenIngrediente,
  NivelAlergeno,
} from '@prisma/client';

// Reexportados desde @prisma/client — evita mantener copias manuales que se
// desincronizan si el schema cambia.
export { CategoriaIngrediente, OrigenIngrediente, NivelAlergeno };

export class AlergenoAsignacionDto {
  @IsInt()
  alergenoId!: number;

  @IsEnum(NivelAlergeno)
  nivel!: NivelAlergeno;
}

export class CreateIngredienteDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsEnum(CategoriaIngrediente)
  categoria!: CategoriaIngrediente;

  @IsOptional()
  @IsInt()
  fdcId?: number;

  @IsNumber()
  @Min(0)
  caloriasPor100g!: number;

  @IsNumber()
  @Min(0)
  proteinasG100g!: number;

  @IsNumber()
  @Min(0)
  grasasG100g!: number;

  @IsNumber()
  @Min(0)
  carbohidratosG100g!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fibraG100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  azucaresG100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodioMg100g?: number;

  @IsEnum(OrigenIngrediente)
  origen!: OrigenIngrediente;

  @IsOptional()
  @IsBoolean()
  esProcesado?: boolean;

  // Positivo, no solo >= 0: un ingrediente a la venta con precio 0 no tiene
  // sentido de negocio (ver el fix de orders.service.ts que rechaza
  // precioPorGramo <= 0 en checkout).
  @IsOptional()
  @IsNumber()
  @IsPositive()
  precioPorGramo?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlergenoAsignacionDto)
  alergenos?: AlergenoAsignacionDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockInicialGramos?: number;
}

export class UpdateIngredienteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsEnum(CategoriaIngrediente)
  categoria?: CategoriaIngrediente;

  @IsOptional()
  @IsInt()
  fdcId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  caloriasPor100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinasG100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grasasG100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbohidratosG100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fibraG100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  azucaresG100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodioMg100g?: number;

  @IsOptional()
  @IsEnum(OrigenIngrediente)
  origen?: OrigenIngrediente;

  @IsOptional()
  @IsBoolean()
  esProcesado?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  precioPorGramo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlergenoAsignacionDto)
  alergenos?: AlergenoAsignacionDto[];
}

export class CreateProveedorDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  // RUC ecuatoriano: 10 (natural/RISE) o 13 dígitos (sociedades).
  @IsString()
  @Matches(/^\d{10}(\d{3})?$/, { message: 'El RUC debe tener 10 o 13 dígitos numéricos' })
  ruc!: string;

  @IsOptional()
  @IsString()
  contacto?: string;
}

export class UpdateProveedorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}(\d{3})?$/, { message: 'El RUC debe tener 10 o 13 dígitos numéricos' })
  ruc?: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateStockDto {
  @IsInt()
  ingredienteId!: number;

  @IsNumber()
  @Min(0)
  gramosDisponibles!: number;
}