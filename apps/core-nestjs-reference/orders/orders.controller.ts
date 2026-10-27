import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/orders.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    const clienteId = req.user?.sub || req.user?.id;
    const clienteEmail = req.user?.email || 'cliente@kairosmix.com';
    return await this.ordersService.checkout(clienteId, clienteEmail, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listPedidos(@Req() req: any) {
    const clienteId = req.user?.sub || req.user?.id;
    const rol = req.user?.rol;
    return await this.ordersService.listPedidos(clienteId, rol);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPedidoById(@Req() req: any, @Param('id') id: string) {
    const clienteId = req.user?.sub || req.user?.id;
    const rol = req.user?.rol;
    // Se pasan clienteId/rol al service para verificar propiedad —
    // un CLIENTE solo puede ver sus propios pedidos, admin/vendedor ven todos.
    return await this.ordersService.getPedidoById(id, clienteId, rol);
  }
}
