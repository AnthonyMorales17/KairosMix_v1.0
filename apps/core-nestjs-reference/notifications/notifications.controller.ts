import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Rol } from '../common/decorators/roles.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.VENDEDOR)
  @Get('logs')
  async listLogs() {
    return await this.notificationsService.listLogs();
  }
}
