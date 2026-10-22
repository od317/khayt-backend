import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { assertStore } from './cart-access';
import {
    AddCartItemDto,
} from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
    CartResponse,
    CartItemResponse,
    toCartItemResponse,
    toCartResponse,
} from './cart.mapper';
import { OrdersService } from '../orders/orders.service';
import { OrderDetailResponse } from '../orders/orders.mapper';
import { CheckoutDto } from './dto/checkout.dto';
import { assertCartVariantAllowsSaleRule } from '../products/sale-rule';

const MAX_CART_ITEMS = 100;
const MAX_QUANTITY_PER_ITEM = 10000;

const CART_INCLUDE = {
    product: true,
} as const;

@Injectable()
export class CartService {
    constructor(private readonly prisma: PrismaService, private readonly orders: OrdersService,) { }

    // ─────────────────────────────────────────────────────────
    // Read
    // ─────────────────────────────────────────────────────────

    async getCart(actor: AuthenticatedUser): Promise<CartResponse> {
        assertStore(actor);

        const items = await this.prisma.cartItem.findMany({
            where: { userId: actor.id },
            orderBy: { createdAt: 'asc' },
            include: CART_INCLUDE,
        });

        return toCartResponse(items);
    }

    // ─────────────────────────────────────────────────────────
    // Add / update
    // ─────────────────────────────────────────────────────────

    async addItem(
        actor: AuthenticatedUser,
        dto: AddCartItemDto,
    ): Promise<CartItemResponse> {
        assertStore(actor);

        const quantity = dto.quantity ?? 1;

        if (quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
            throw new HttpException(
                {
                    error: 'validation_failed',
                    message: `الكمية يجب أن تكون بين 1 و${MAX_QUANTITY_PER_ITEM}`,
                    fields: { quantity: `يجب أن تكون بين 1 و${MAX_QUANTITY_PER_ITEM}` },
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, deletedAt: null },
        });

        if (!product) {
            throw new NotFoundException({
                error: 'not_found',
                message: 'المنتج غير موجود',
            });
        }

        if (!product.available) {
            throw new BadRequestException({
                error: 'product_unavailable',
                message: 'المنتج غير متاح',
            });
        }

        const variant = dto.variant ?? null;
        assertCartVariantAllowsSaleRule(product.saleRule, variant);
        const variantKey = buildVariantKey(variant);

        // Enforce the max items per cart.
        const existingCount = await this.prisma.cartItem.count({
            where: { userId: actor.id },
        });

        const existing = await this.prisma.cartItem.findUnique({
            where: {
                userId_productId_variantKey: {
                    userId: actor.id,
                    productId: dto.productId,
                    variantKey,
                },
            },
            include: CART_INCLUDE,
        });

        if (!existing && existingCount >= MAX_CART_ITEMS) {
            throw new HttpException(
                {
                    error: 'cart_full',
                    message: `السلة لا تقبل أكثر من ${MAX_CART_ITEMS} أصناف`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const nextQuantity = Math.min(
            (existing?.quantity ?? 0) + quantity,
            MAX_QUANTITY_PER_ITEM,
        );

        const item = existing
            ? await this.prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: nextQuantity },
                include: CART_INCLUDE,
            })
            : await this.prisma.cartItem.create({
                data: {
                    userId: actor.id,
                    productId: dto.productId,
                    quantity: nextQuantity,
                    variant: variant as Prisma.InputJsonValue | undefined,
                    variantKey,
                },
                include: CART_INCLUDE,
            });

        return toCartItemResponse(item);
    }

    async updateItemQuantity(
        actor: AuthenticatedUser,
        itemId: string,
        dto: UpdateCartItemDto,
    ): Promise<CartItemResponse> {
        assertStore(actor);

        if (dto.quantity < 1 || dto.quantity > MAX_QUANTITY_PER_ITEM) {
            throw new HttpException(
                {
                    error: 'validation_failed',
                    message: `الكمية يجب أن تكون بين 1 و${MAX_QUANTITY_PER_ITEM}`,
                    fields: { quantity: `يجب أن تكون بين 1 و${MAX_QUANTITY_PER_ITEM}` },
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const item = await this.prisma.cartItem.findFirst({
            where: { id: itemId, userId: actor.id },
            include: CART_INCLUDE,
        });

        if (!item) {
            throw new NotFoundException({
                error: 'not_found',
                message: 'عنصر السلة غير موجود',
            });
        }

        const updated = await this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: dto.quantity },
            include: CART_INCLUDE,
        });

        return toCartItemResponse(updated);
    }

    // ─────────────────────────────────────────────────────────
    // Remove
    // ─────────────────────────────────────────────────────────

    async removeItem(
        actor: AuthenticatedUser,
        itemId: string,
    ): Promise<{ removed: true }> {
        assertStore(actor);

        const item = await this.prisma.cartItem.findFirst({
            where: { id: itemId, userId: actor.id },
            select: { id: true },
        });

        if (!item) {
            throw new NotFoundException({
                error: 'not_found',
                message: 'عنصر السلة غير موجود',
            });
        }

        await this.prisma.cartItem.delete({ where: { id: itemId } });
        return { removed: true };
    }

    async clearCart(actor: AuthenticatedUser): Promise<{ cleared: true }> {
        assertStore(actor);

        await this.prisma.cartItem.deleteMany({ where: { userId: actor.id } });
        return { cleared: true };
    }

    async checkout(
        actor: AuthenticatedUser,
        dto: CheckoutDto,
    ): Promise<OrderDetailResponse> {
        assertStore(actor);

        // 1. Load cart items with product info.
        const cartItems = await this.prisma.cartItem.findMany({
            where: { userId: actor.id },
            orderBy: { createdAt: 'asc' },
            include: {
                product: {
                    select: {
                        id: true,
                        deletedAt: true,
                        available: true,
                    },
                },
            },
        });

        if (cartItems.length === 0) {
            throw new BadRequestException({
                error: 'empty_cart',
                message: 'السلة فارغة',
            });
        }

        // 2. Fast-fail on obvious problems before delegating to orders.
        for (const item of cartItems) {
            if (item.product.deletedAt !== null) {
                throw new BadRequestException({
                    error: 'product_unavailable',
                    message: `المنتج لم يعد موجوداً: ${item.productId}`,
                    fields: { productId: item.productId },
                });
            }
            if (!item.product.available) {
                throw new BadRequestException({
                    error: 'product_unavailable',
                    message: `المنتج غير متاح حالياً: ${item.productId}`,
                    fields: { productId: item.productId },
                });
            }
        }

        // 3. Map cart items → CreateOrderDto lines.
        const lines = cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variant:
                item.variant &&
                    typeof item.variant === 'object' &&
                    !Array.isArray(item.variant)
                    ? (item.variant as Record<string, string>)
                    : undefined,
        }));

        // 4. Delegate to the existing order pipeline.
        //    Forward the delivery address so `resolveOrderDropoff` gets it.
        const order = await this.orders.create(actor, {
            lines,
            address: dto.address,
            lat: dto.lat,
            lng: dto.lng,
        });

        // 5. Clear the cart ONLY after the order was created successfully.
        await this.prisma.cartItem.deleteMany({ where: { userId: actor.id } });

        return order;
    }
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * Deterministic string representation of the variant object.
 * Keys are sorted so `{ size: 'L', color: 'أبيض' }` produces the same
 * key as `{ color: 'أبيض', size: 'L' }`.
 *
 * Empty/null variant → empty string, which is used as the "no variant"
 * sentinel and keeps the @@unique constraint working (Postgres treats
 * NULL as distinct in unique indexes).
 */
function buildVariantKey(
    variant: Record<string, string> | null | undefined,
): string {
    if (!variant) return '';
    const entries = Object.entries(variant)
        .filter(([, v]) => typeof v === 'string' && v.length > 0)
        .sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) return '';
    return entries.map(([k, v]) => `${k}:${v}`).join('|');
}