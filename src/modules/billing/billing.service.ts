import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  BillStatus,
  BusinessType,
  NotificationType,
  PaymentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { CREDIT_DUE_DAYS } from './constants';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { QueryBillsDto } from './dto/query-bills.dto';
import { QueryReceivingDto } from './dto/query-receiving.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import {
  BillDetailResponse,
  BillLineResponse,
  BillResponse,
  PaymentResponse,
  ReceivingDetailResponse,
  ReceivingLineResponse,
  ReceivingResponse,
  toBillLineResponse,
  toBillResponse,
  toBusinessSummary,
  toPaymentResponse,
  toReceivingLineResponse,
  toReceivingResponse,
  toReceivingSummary,
} from './billing.mapper';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================================
  // Receiving
  // ============================================================

  async listReceiving(
    query: QueryReceivingDto,
  ): Promise<Paginated<ReceivingResponse>> {
    const where: Prisma.ReceivingWhereInput = {};
    if (query.businessId) where.businessId = query.businessId;

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.receiving.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take,
        include: { business: true, lines: true },
      }),
      this.prisma.receiving.count({ where }),
    ]);

    return paginate(
      rows.map((r) => {
        const sum = r.lines.reduce(
          (acc, line) => acc + line.quantity * line.unitPrice,
          0,
        );
        return toReceivingResponse(r, sum);
      }),
      total,
      query.page,
      query.limit,
    );
  }

  async getReceiving(id: string): Promise<ReceivingDetailResponse> {
    const receiving = await this.prisma.receiving.findUnique({
      where: { id },
      include: {
        business: true,
        lines: { include: { product: true } },
        bill: true,
      },
    });

    if (!receiving) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Receiving not found',
      });
    }

    if (!receiving.bill) {
      throw new InternalServerErrorException({
        error: 'internal_error',
        message: 'Receiving is missing its bill',
      });
    }

    const billWithBusiness = await this.prisma.bill.findUnique({
      where: { id: receiving.bill.id },
      include: { business: true },
    });
    if (!billWithBusiness) {
      throw new InternalServerErrorException({
        error: 'internal_error',
        message: 'Receiving is missing its bill',
      });
    }

    const total = receiving.lines.reduce(
      (acc, line) => acc + line.quantity * line.unitPrice,
      0,
    );

    return {
      receiving: toReceivingResponse(receiving, total),
      lines: receiving.lines.map(toReceivingLineResponse),
      bill: toBillResponse(billWithBusiness),
    };
  }

  async createReceiving(
    actor: AuthenticatedUser,
    dto: CreateReceivingDto,
  ): Promise<{
    receiving: ReceivingResponse & { lines: ReceivingLineResponse[] };
    bill: BillResponse & { lines: BillLineResponse[] };
  }> {
    // Reject duplicate products in one receiving.
    const seen = new Set<string>();
    for (let i = 0; i < dto.lines.length; i++) {
      const line = dto.lines[i];
      if (!line) continue;
      if (seen.has(line.productId)) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'Duplicate product in receiving',
            fields: { [`lines[${i}].productId`]: 'duplicate' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      seen.add(line.productId);
    }

    // Verify the business exists and is a workshop (supplier).
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });
    if (!business) {
      throw new NotFoundException({
        error: 'not_found',
        resource: 'business',
        message: 'Business not found',
      });
    }
    if (business.type !== BusinessType.workshop) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Receiving supplier must be a workshop',
          fields: { businessId: 'must be a workshop' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify every product exists; link/validate supplier workshop.
    const productIds = dto.lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    for (let i = 0; i < dto.lines.length; i++) {
      const line = dto.lines[i];
      if (!line) continue;
      const product = productById.get(line.productId);
      if (!product) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'Unknown product',
            fields: { [`lines[${i}].productId`]: 'unknown product' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        product.supplierBusinessId != null &&
        product.supplierBusinessId !== dto.businessId
      ) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'Product is linked to a different workshop',
            fields: {
              [`lines[${i}].productId`]: 'supplier mismatch',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const billTotal = dto.lines.reduce(
      (acc, line) => acc + line.quantity * line.unitPrice,
      0,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const [{ nextval: rcvNext }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('receiving_number_seq') AS nextval
      `;
      const receivingNumber = `RCV-${rcvNext.toString()}`;

      const receiving = await tx.receiving.create({
        data: {
          number: receivingNumber,
          businessId: dto.businessId,
          paymentType: dto.paymentType,
          createdBy: actor.id,
          lines: {
            create: dto.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
        include: { business: true },
      });

      for (const line of dto.lines) {
        await tx.supply.upsert({
          where: { productId: line.productId },
          create: {
            productId: line.productId,
            sent: line.quantity,
            remaining: line.quantity,
            unitPrice: line.unitPrice,
          },
          update: {
            sent: { increment: line.quantity },
            remaining: { increment: line.quantity },
            unitPrice: line.unitPrice,
          },
        });
      }

      await tx.product.updateMany({
        where: { id: { in: productIds }, supplierBusinessId: null },
        data: {
          inWarehouse: true,
          supplierBusinessId: dto.businessId,
        },
      });

      await tx.product.updateMany({
        where: {
          id: { in: productIds },
          supplierBusinessId: dto.businessId,
        },
        data: { inWarehouse: true },
      });

      const [{ nextval: billNext }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('bill_number_seq') AS nextval
      `;
      const billNumber = `BILL-${billNext.toString()}`;

      const dueAt =
        dto.paymentType === PaymentType.credit
          ? new Date(Date.now() + CREDIT_DUE_DAYS * 24 * 60 * 60 * 1000)
          : null;

      const bill = await tx.bill.create({
        data: {
          number: billNumber,
          businessId: dto.businessId,
          receivingId: receiving.id,
          paymentType: dto.paymentType,
          dueAt,
          total: billTotal,
          paid: 0,
          status: BillStatus.unpaid,
          lines: {
            create: dto.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
        include: { business: true },
      });

      const supplies = await tx.supply.findMany({
        where: { productId: { in: productIds } },
        select: { id: true, productId: true },
      });
      const supplyByProduct = new Map(supplies.map((s) => [s.productId, s.id]));

      const movementData = dto.lines
        .map((line) => {
          const supplyId = supplyByProduct.get(line.productId);
          if (!supplyId) return null;
          return {
            supplyId,
            type: 'in' as const,
            quantity: line.quantity,
            reference: receivingNumber,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (movementData.length > 0) {
        await tx.stockMovement.createMany({ data: movementData });
      }

      const billLines = await tx.billLine.findMany({
        where: { billId: bill.id },
        include: { product: true },
      });

      const receivingLines = await tx.receivingLine.findMany({
        where: { receivingId: receiving.id },
        include: { product: true },
      });

      return { receiving, bill, billLines, receivingLines };
    });

    // Notify the business owner — after the transaction commits.
    await this.notifications.notify({
      userId: result.receiving.business.ownerId,
      type: NotificationType.receiving_confirmed,
      title: 'تم استلام شحنتك',
      body: `تم استلام ${result.receiving.number} بقيمة ${billTotal} ل.س`,
      linkTo: '/supply',
    });

    return {
      receiving: {
        ...toReceivingResponse(result.receiving, billTotal),
        lines: result.receivingLines.map(toReceivingLineResponse),
      },
      bill: {
        ...toBillResponse(result.bill),
        lines: result.billLines.map(toBillLineResponse),
      },
    };
  }

  // ============================================================
  // Bills
  // ============================================================

  async listBills(query: QueryBillsDto): Promise<Paginated<BillResponse>> {
    const where: Prisma.BillWhereInput = {};
    if (query.businessId) where.businessId = query.businessId;
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [{ number: { contains: query.q, mode: 'insensitive' } }];
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bill.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip,
        take,
        include: { business: true },
      }),
      this.prisma.bill.count({ where }),
    ]);

    return paginate(rows.map(toBillResponse), total, query.page, query.limit);
  }

  async getBill(id: string): Promise<BillDetailResponse> {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        business: true,
        receiving: true,
        lines: { include: { product: true } },
        payments: { include: { recorder: true } },
      },
    });

    if (!bill) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Bill not found',
      });
    }

    return {
      bill: toBillResponse(bill),
      lines: bill.lines.map(toBillLineResponse),
      payments: bill.payments.map(toPaymentResponse),
      business: toBusinessSummary(bill.business),
      receiving: toReceivingSummary(bill.receiving),
    };
  }

  async recordPayment(
    billId: string,
    actor: AuthenticatedUser,
    dto: RecordPaymentDto,
  ): Promise<{ payment: PaymentResponse; bill: BillResponse }> {
    if (dto.amount <= 0) {
      throw new HttpException(
        {
          error: 'amount_not_positive',
          message: 'Payment amount must be positive',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Bill" WHERE id = ${billId} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Bill not found',
        });
      }

      const bill = await tx.bill.findUnique({
        where: { id: billId },
        include: { business: true },
      });
      if (!bill) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Bill not found',
        });
      }

      const remaining = bill.total - bill.paid;
      if (dto.amount > remaining) {
        throw new HttpException(
          {
            error: 'amount_exceeds_balance',
            message: 'Payment exceeds the remaining balance',
            remaining,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const payment = await tx.payment.create({
        data: {
          billId,
          amount: dto.amount,
          recordedBy: actor.id,
        },
        include: { recorder: true },
      });

      const newPaid = bill.paid + dto.amount;
      const newStatus = this.computeBillStatus(newPaid, bill.total);

      const updatedBill = await tx.bill.update({
        where: { id: billId },
        data: { paid: newPaid, status: newStatus },
        include: { business: true },
      });

      return { payment, bill: updatedBill };
    });

    // Notify the business owner — after the transaction commits.
    await this.notifications.notify({
      userId: result.bill.business.ownerId,
      type: NotificationType.order_status,
      title: 'تم تسجيل دفعة',
      body: `تم تسجيل دفعة بقيمة ${dto.amount} ل.س على الفاتورة ${result.bill.number}`,
      linkTo: `/bills/${result.bill.id}`,
    });

    return {
      payment: toPaymentResponse(result.payment),
      bill: toBillResponse(result.bill),
    };
  }

  async billsSummary(query: { businessId?: string }): Promise<{
    total: number;
    paid: number;
    remaining: number;
    count: number;
  }> {
    const where: Prisma.BillWhereInput = {};
    if (query.businessId) where.businessId = query.businessId;

    const agg = await this.prisma.bill.aggregate({
      where,
      _sum: { total: true, paid: true },
      _count: { _all: true },
    });

    const total = agg._sum.total ?? 0;
    const paid = agg._sum.paid ?? 0;

    return {
      total,
      paid,
      remaining: total - paid,
      count: agg._count._all,
    };
  }

  private computeBillStatus(paid: number, total: number): BillStatus {
    if (paid >= total) return BillStatus.paid;
    if (paid > 0) return BillStatus.partial;
    return BillStatus.unpaid;
  }
}
