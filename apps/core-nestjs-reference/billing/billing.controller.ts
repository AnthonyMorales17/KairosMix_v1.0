import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Rol } from '../common/decorators/roles.decorator';

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('facturas/:pedidoId')
  async getFacturaByPedidoId(@Req() req: any, @Param('pedidoId') pedidoId: string) {
    const clienteId = req.user?.sub || req.user?.id;
    const rol = req.user?.rol;
    // clienteId/rol se pasan al service para verificar propiedad —
    // mismo patrón que getPedidoById en Orders.
    return await this.billingService.getFacturaByPedidoId(pedidoId, clienteId, rol);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Get('facturas')
  async listFacturas() {
    return await this.billingService.listFacturas();
  }
}