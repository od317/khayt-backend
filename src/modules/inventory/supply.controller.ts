import { Controller, Get, Query } from '@nestjs/common';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { QuerySupplyDto } from './dto/query-supply.dto';
import { InventoryService, SupplyListResponse } from './inventory.service';

@Controller('supply')
export class SupplyController {
  constructor(private readonly inventory: InventoryService) { }

  @Get()
  list(
    @Query() query: QuerySupplyDto,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<SupplyListResponse> {
    return this.inventory.listSupply(query, user);
  }
}