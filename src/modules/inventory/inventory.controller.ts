import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { UserRole } from '@prisma/client';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import {
  InventoryDetailResponse,
  InventoryListResponse,
  InventoryService,
} from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) { }

  @Get()
  @Roles(UserRole.inventory, UserRole.admin, UserRole.super_admin)
  list(
    @Query() query: QueryInventoryDto,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<InventoryListResponse> {
    return this.inventory.listInventory(query, user);
  }

  @Get(':id')
  @Roles(UserRole.inventory, UserRole.admin, UserRole.super_admin)
  detail(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<InventoryDetailResponse> {
    return this.inventory.detail(id, user);
  }
}