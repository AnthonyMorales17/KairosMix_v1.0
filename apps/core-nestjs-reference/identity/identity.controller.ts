import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { LoginDto, RefreshTokenDto, CreateUserDto } from './dto/identity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Rol } from '../common/decorators/roles.decorator';

@Controller('auth')
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.identityService.login(loginDto);
  }

  @Post('refresh')
  async refreshTokens(@Body() refreshDto: RefreshTokenDto) {
    return await this.identityService.refreshTokens(refreshDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.identityService.createUser(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Get('users')
  async listUsers() {
    return await this.identityService.listUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Patch('users/:id/status')
  async toggleUserStatus(@Param('id') id: string, @Body('activo') activo: boolean) {
    return await this.identityService.toggleUserStatus(id, activo);
  }
}
