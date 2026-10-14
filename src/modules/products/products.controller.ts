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
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { diskStorage } from 'multer';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import {
  paginated,
  sampleProduct,
  sampleProductNamesResponse,
} from '../../common/swagger/samples';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse } from './products.mapper';
import { ProductDetailResponse, ProductsService } from './products.service';

const PRODUCT_STAFF_ROLES = [
  UserRole.admin,
  UserRole.super_admin,
  UserRole.inventory,
] as const;

const productImagesStorage = diskStorage({
  destination: './uploads/products',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const ProductFilesInterceptor = AnyFilesInterceptor({
  storage: productImagesStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 48 },
});

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // ⚠️ Order matters: 'names' must come BEFORE ':id'.
  @Get('names')
  @Roles(...PRODUCT_STAFF_ROLES)
  @ApiOperation({
    summary: 'List product names',
    description: 'Staff only. Returns id/name pairs for the platform catalog.',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Product names',
    schema: { example: sampleProductNamesResponse },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid token',
    schema: {
      example: {
        error: 'unauthorized',
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  names(
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ items: { id: string; name: string }[] }> {
    return this.products.names(user);
  }

  @Public()
  @Get()
  @ApiSecurity({}) // clears the global bearer requirement on this public route
  @ApiOperation({ summary: 'List products' })
  @ApiOkResponse({ description: 'Paginated list of products' })
  list(@Query() query: QueryProductsDto): Promise<Paginated<ProductResponse>> {
    return this.products.list(query);
  }

  @Public()
  @Get(':id/similar')
  @ApiSecurity({})
  @ApiOperation({
    summary: 'Similar products',
    description:
      'Paginated similar products: same category first, then other available products.',
  })
  @ApiOkResponse({
    description: 'Paginated similar products',
    schema: { example: paginated(sampleProduct) },
  })
  similar(
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ): Promise<Paginated<ProductResponse>> {
    return this.products.listSimilar(id, query);
  }

  @Public()
  @Get(':id')
  @ApiSecurity({})
  @ApiOperation({ summary: 'Product detail' })
  @ApiOkResponse({ description: 'Product with optional available quantity' })
  detail(@Param('id') id: string): Promise<ProductDetailResponse> {
    return this.products.detail(id);
  }

  @Post()
  @Roles(...PRODUCT_STAFF_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ProductFilesInterceptor)
  @ApiOperation({
    summary: 'Create product',
    description:
      'Staff only. multipart/form-data. Gallery images use the field name `images`. Variant images use `variant_<optionIndex>` and `variant_<optionIndex>_child_<childIndex>`.',
  })
  @ApiBearerAuth('access-token')
  create(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ): Promise<{ product: ProductResponse }> {
    return this.products.create(user, dto, files);
  }

  @Patch(':id')
  @Roles(...PRODUCT_STAFF_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ProductFilesInterceptor)
  @ApiOperation({ summary: 'Update product (staff only)' })
  @ApiBearerAuth('access-token')
  update(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ): Promise<{ product: ProductResponse }> {
    return this.products.update(id, user, dto, files);
  }

  @Delete(':id')
  @Roles(...PRODUCT_STAFF_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete product (staff only)' })
  @ApiBearerAuth('access-token')
  remove(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ product: ProductResponse; softDeleted: true }> {
    return this.products.remove(id, user);
  }
}
