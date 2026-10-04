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
import { CreatePostOptionDto } from './dto/create-post-option.dto';
import { QueryAdminPostOptionsDto } from './dto/query-post-options.dto';
import { UpdatePostOptionDto } from './dto/update-post-option.dto';
import {
  PostOptionAdminItem,
  PostOptionsService,
} from './post-options.service';

@Controller('admin/post-options')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminPostOptionsController {
  constructor(private readonly options: PostOptionsService) {}

  @Get()
  list(
    @Query() query: QueryAdminPostOptionsDto,
  ): Promise<{ items: PostOptionAdminItem[] }> {
    return this.options.listAdmin(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePostOptionDto,
  ): Promise<{ option: PostOptionAdminItem }> {
    return this.options.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostOptionDto,
  ): Promise<{ option: PostOptionAdminItem }> {
    return this.options.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.options.remove(id);
  }
}
