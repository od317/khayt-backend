import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { QuerySupplyDto } from './dto/query-supply.dto';
import { InventoryService, SupplyListResponse } from './inventory.service';

@Controller('supply')
export class SupplyController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @Roles(
    UserRole.inventory,
    UserRole.admin,
    UserRole.super_admin,
    UserRole.workshop,
  )
  list(
    @Query() query: QuerySupplyDto,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<SupplyListResponse> {
    return this.inventory.listSupply(query, user);
  }
}
