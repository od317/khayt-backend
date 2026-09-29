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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import {
  AdminLocationResponse,
  LocationsService,
} from './locations.service';

@Controller('admin/locations')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminLocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  listAll(): Promise<{ items: AdminLocationResponse[] }> {
    return this.locations.listAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateLocationDto,
  ): Promise<{ location: AdminLocationResponse }> {
    return this.locations.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<{ location: AdminLocationResponse }> {
    return this.locations.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.locations.remove(id);
  }
}
