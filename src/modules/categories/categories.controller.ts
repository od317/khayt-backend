import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CategoriesService, CategoryResponse } from './categories.service';
import { QueryCategoriesDto } from './dto/query-categories.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list(
    @Query() query: QueryCategoriesDto,
  ): Promise<{ items: CategoryResponse[] }> {
    return this.categories.list(query);
  }
}
