import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import { UserResponse } from '../auth/auth.mapper';
import { AdminService } from './admin.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('users')
  @Roles(UserRole.super_admin)
  @HttpCode(HttpStatus.CREATED)
  createStaffUser(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    return this.admin.createStaffUser(user, dto);
  }

  @Get('users')
  @Roles(UserRole.super_admin)
  listUsers(
    @RequireUser() user: AuthenticatedUser,
    @Query() query: QueryUsersDto,
  ): Promise<Paginated<UserResponse>> {
    return this.admin.listUsers(user, query);
  }

  @Patch('users/:id')
  @Roles(UserRole.super_admin)
  updateUser(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    return this.admin.updateUser(user, id, dto);
  }
}
