import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  RequireUser,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BusinessOwnerGuard } from '../../common/guards/business-owner.guard';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import {
  BusinessDetailResponse,
  BusinessesService,
} from './businesses.service';
import { BusinessResponse } from './businesses.mapper';
import { CreateBusinessDto } from './dto/create-business.dto';
import { QueryBusinessesDto } from './dto/query-businesses.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Public()
  @Get()
  list(
    @Query() query: QueryBusinessesDto,
  ): Promise<Paginated<BusinessResponse>> {
    return this.businesses.list(query);
  }

  @Public()
  @Get(':id')
  detail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<BusinessDetailResponse> {
    return this.businesses.detail(id, user);
  }

  @Post()
  create(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessDto,
  ): Promise<{ business: BusinessResponse }> {
    return this.businesses.create(user, dto);
  }

  @UseGuards(BusinessOwnerGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ): Promise<{ business: BusinessResponse }> {
    return this.businesses.update(id, dto);
  }
}
