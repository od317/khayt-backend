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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemResponse, CartResponse } from './cart.mapper';

@ApiTags('cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CartController {
    constructor(private readonly cart: CartService) { }

    @Get()
    @ApiOperation({
        summary: 'Get the current store\'s cart',
        description:
            'Store accounts only. Returns items grouped by business, with totals.',
    })
    @ApiOkResponse({ description: 'The cart, grouped by business' })
    getCart(@RequireUser() user: AuthenticatedUser): Promise<CartResponse> {
        return this.cart.getCart(user);
    }

    @Post('items')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Add a product (with optional variant) to the cart',
        description:
            'Store accounts only. If the same product + variant is already in the cart, quantities are summed.',
    })
    @ApiOkResponse({ description: 'The created or updated cart item' })
    addItem(
        @RequireUser() user: AuthenticatedUser,
        @Body() dto: AddCartItemDto,
    ): Promise<CartItemResponse> {
        return this.cart.addItem(user, dto);
    }

    @Patch('items/:id')
    @ApiOperation({
        summary: 'Update a cart item\'s quantity',
        description: 'Store accounts only.',
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
        description: 'Store accounts only.',
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
        description: 'Store accounts only.',
    })
    @ApiOkResponse({ description: 'Cleared' })
    clearCart(
        @RequireUser() user: AuthenticatedUser,
    ): Promise<{ cleared: true }> {
        return this.cart.clearCart(user);
    }

    @Post('checkout')
    @HttpCode(HttpStatus.NOT_IMPLEMENTED)
    @ApiOperation({
        summary: 'Place the cart as an order (not implemented yet)',
        description:
            'Store accounts only. Will create an Order with status `review` and decrement stock. Currently returns 501.',
    })
    checkout(@RequireUser() user: AuthenticatedUser): Promise<never> {
        return this.cart.checkout(user);
    }
}