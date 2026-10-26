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
import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { AddCartItemsResponse, CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemResponse, CartResponse } from './cart.mapper';
import { OrderDetailResponse } from '../orders/orders.mapper';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CartController {
    constructor(private readonly cart: CartService) { }

    @Get()
    @ApiOperation({
        summary: 'Get the current cart',
        description:
            'Store and workshop accounts only. Returns flat items + totals.',
    })
    @ApiOkResponse({ description: 'The cart' })
    getCart(@RequireUser() user: AuthenticatedUser): Promise<CartResponse> {
        return this.cart.getCart(user);
    }

    @Post('items')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Add a product (with optional variant) to the cart',
        description:
            'Store and workshop accounts only. If the same product + variant is already in the cart, quantities are summed. For `color_pair_pack`, send `pairColor` or `pairColors` (one or more); each second color becomes its own cart line. Response is always `{ items: [...] }`.',
    })
    @ApiOkResponse({ description: 'Created or updated cart item(s)' })
    addItem(
        @RequireUser() user: AuthenticatedUser,
        @Body() dto: AddCartItemDto,
    ): Promise<AddCartItemsResponse> {
        return this.cart.addItem(user, dto);
    }

    @Patch('items/:id')
    @ApiOperation({
        summary: 'Update a cart item\'s quantity',
        description: 'Store and workshop accounts only.',
    })
    @ApiOkResponse({ description: 'The updated cart item' })
    updateItem(
        @Param('id') id: string,
        @RequireUser() user: AuthenticatedUser,
        @Body() dto: UpdateCartItemDto,
    ): Promise<CartItemResponse> {
        return this.cart.updateItemQuantity(user, id, dto);
    }

    @Delete('items/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Remove one item from the cart',
        description: 'Store and workshop accounts only.',
    })
    @ApiOkResponse({ description: 'Removed' })
    removeItem(
        @Param('id') id: string,
        @RequireUser() user: AuthenticatedUser,
    ): Promise<{ removed: true }> {
        return this.cart.removeItem(user, id);
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Empty the cart',
        description: 'Store and workshop accounts only.',
    })
    @ApiOkResponse({ description: 'Cleared' })
    clearCart(
        @RequireUser() user: AuthenticatedUser,
    ): Promise<{ cleared: true }> {
        return this.cart.clearCart(user);
    }

    @Post('checkout')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Place the cart as an order',
        description:
            'Store and workshop accounts only. Creates an Order with status `review`. Requires saved delivery coordinates (`deliveryLat` / `deliveryLng`); optional `address`/`lat`/`lng` update the saved pin.',
    })
    @ApiOkResponse({ description: 'The created order with its lines' })
    checkout(
        @RequireUser() user: AuthenticatedUser,
        @Body() dto: CheckoutDto,
    ): Promise<OrderDetailResponse> {
        return this.cart.checkout(user, dto);
    }
}