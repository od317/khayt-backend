import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import {
  BillLineResponse,
  BillResponse,
  ReceivingDetailResponse,
  ReceivingLineResponse,
  ReceivingResponse,
} from './billing.mapper';
import { BillingService } from './billing.service';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { QueryReceivingDto } from './dto/query-receiving.dto';

const BILLING_ROLES = [
  UserRole.inventory,
  UserRole.admin,
  UserRole.super_admin,
] as const;

type CreateReceivingResponse = {
  receiving: ReceivingResponse & { lines: ReceivingLineResponse[] };
  bill: BillResponse & { lines: BillLineResponse[] };
};

@Controller('receiving')
export class ReceivingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @Roles(...BILLING_ROLES)
  list(
    @Query() query: QueryReceivingDto,
  ): Promise<Paginated<ReceivingResponse>> {
    return this.billing.listReceiving(query);
  }

  @Get(':id')
  @Roles(...BILLING_ROLES)
  detail(@Param('id') id: string): Promise<ReceivingDetailResponse> {
    return this.billing.getReceiving(id);
  }

  @Post()
  @Roles(...BILLING_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateReceivingDto,
  ): Promise<CreateReceivingResponse> {
    return this.billing.createReceiving(user, dto);
  }
}
