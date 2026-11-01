import { NotFoundException } from '@nestjs/common';
import { ProductAudience, UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { OrdersService } from '../orders/orders.service';
import { CartService } from './cart.service';

describe('CartService product audience', () => {
  it('does not allow a store to add a workshop-only product', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = {
      product: { findFirst },
    } as unknown as PrismaService;
    const service = new CartService(prisma, {} as OrdersService);
    const store: AuthenticatedUser = {
      id: 'store-1',
      role: UserRole.store,
      phone: null,
    };

    await expect(
      service.addItem(store, { productId: 'workshop-only-product' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'workshop-only-product',
        deletedAt: null,
        audience: { in: [ProductAudience.store, ProductAudience.both] },
      },
    });
  });
});
