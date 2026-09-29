import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AdminRoleResponse, RolesService } from './roles.service';

@Controller('admin/roles')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminRolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  listAll(): Promise<{ items: AdminRoleResponse[] }> {
    return this.roles.listAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRoleDto): Promise<{ role: AdminRoleResponse }> {
    return this.roles.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<{ role: AdminRoleResponse }> {
    return this.roles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.roles.remove(id);
  }
}
