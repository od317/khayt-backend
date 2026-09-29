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
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService, CategoryResponse } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('admin/categories')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  listAll(
    @Query() query: QueryCategoriesDto,
  ): Promise<{ items: CategoryResponse[] }> {
    return this.categories.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCategoryDto,
  ): Promise<{ category: CategoryResponse }> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<{ category: CategoryResponse }> {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.categories.remove(id);
  }
}
