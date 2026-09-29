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
import { ApiBody } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Paginated } from '../../common/utils/pagination';
import { UserResponse } from '../auth/auth.mapper';
import { AdminService } from './admin.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import {
  UPDATE_EMPLOYEE_EXAMPLE,
  UpdateEmployeeDto,
} from './dto/update-employee.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@Controller('admin')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Query() query: QueryUsersDto): Promise<Paginated<UserResponse>> {
    return this.admin.listAppUsers(query);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    return this.admin.updateAppUser(id, dto);
  }

  @Get('employees')
  listEmployees(
    @Query() query: QueryUsersDto,
  ): Promise<Paginated<UserResponse>> {
    return this.admin.listEmployees(query);
  }

  @Post('employees')
  @HttpCode(HttpStatus.CREATED)
  createEmployee(
    @Body() dto: CreateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    return this.admin.createEmployee(dto);
  }

  @Patch('employees/:id')
  @ApiBody({
    type: UpdateEmployeeDto,
    examples: {
      allFields: {
        summary: 'All editable fields',
        value: UPDATE_EMPLOYEE_EXAMPLE,
      },
    },
  })
  updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<{ user: UserResponse }> {
    return this.admin.updateEmployee(id, dto);
  }
}
