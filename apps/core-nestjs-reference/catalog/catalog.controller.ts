import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateIngredienteDto, UpdateIngredienteDto, CreateProveedorDto, UpdateProveedorDto, UpdateStockDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Rol } from '../common/decorators/roles.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  // 1. Lectura de ingredientes: abierta a cualquier rol autenticado (o cliente público para explorar catálogo)
  @Get('ingredientes')
  async listIngredientes(
    @Query('categoria') categoria?: string,
    @Query('excluirAlergenoId') excluirAlergenoId?: number,
    @Query('soloActivos') soloActivos?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return await this.catalogService.listIngredientes({
      categoria,
      excluirAlergenoId: excluirAlergenoId ? Number(excluirAlergenoId) : undefined,
      soloActivos: soloActivos !== 'false',
      busqueda,
    });
  }

  @Get('ingredientes/:id')
  async getIngredienteById(@Param('id', ParseIntPipe) id: number) {
    return await this.catalogService.getIngredienteById(id);
  }

  @Get('alergenos')
  async listAlergenos() {
    return await this.catalogService.listAlergenos();
  }

  // 2. Escritura: solo ADMIN o VENDEDOR
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Post('ingredientes')
  async createIngrediente(@Body() dto: CreateIngredienteDto) {
    return await this.catalogService.createIngrediente(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Put('ingredientes/:id')
  async updateIngrediente(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIngredienteDto) {
    return await this.catalogService.updateIngrediente(id, dto);
  }

  // Desactivar = activo = false, nunca borrado físico
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Delete('ingredientes/:id')
  async deactivateIngrediente(@Param('id', ParseIntPipe) id: number) {
    return await this.catalogService.deactivateIngrediente(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Post('stock')
  async updateStock(@Body() dto: UpdateStockDto) {
    return await this.catalogService.updateStock(dto);
  }

  // Proveedores CRUD (ADMIN o VENDEDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Get('proveedores')
  async listProveedores() {
    return await this.catalogService.listProveedores();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Post('proveedores')
  async createProveedor(@Body() dto: CreateProveedorDto) {
    return await this.catalogService.createProveedor(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Patch('proveedores/:id')
  async updateProveedor(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProveedorDto) {
    return await this.catalogService.updateProveedor(id, dto);
  }
}
