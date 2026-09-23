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
import { BillingService } from './billing.service';
import {
  BillDetailResponse,
  BillResponse,
  PaymentResponse,
} from './billing.mapper';
import { QueryBillsDto } from './dto/query-bills.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

const BILLING_ROLES = [
  UserRole.inventory,
  UserRole.admin,
  UserRole.super_admin,
] as const;

@Controller('bills')
export class BillsController {
  constructor(private readonly billing: BillingService) {}

  @Get('summary')
  @Roles(...BILLING_ROLES)
  summary(@Query() query: { businessId?: string }): Promise<{
    total: number;
    paid: number;
    remaining: number;
    count: number;
  }> {
    return this.billing.billsSummary(query);
  }

  @Get()
  @Roles(...BILLING_ROLES)
  list(@Query() query: QueryBillsDto): Promise<Paginated<BillResponse>> {
    return this.billing.listBills(query);
  }

  @Get(':id')
  @Roles(...BILLING_ROLES)
  detail(@Param('id') id: string): Promise<BillDetailResponse> {
    return this.billing.getBill(id);
  }

  @Post(':id/payments')
  @Roles(...BILLING_ROLES)
  @HttpCode(HttpStatus.CREATED)
  recordPayment(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: RecordPaymentDto,
  ): Promise<{ payment: PaymentResponse; bill: BillResponse }> {
    return this.billing.recordPayment(id, user, dto);
  }
}
