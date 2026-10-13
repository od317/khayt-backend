import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Paginated } from '../../common/utils/pagination';
import { BusinessResponse } from './businesses.mapper';
import {
  BusinessesService,
  PublicProfileResponse,
} from './businesses.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Public()
  @Get(':id/similar')
  @ApiOperation({
    summary: 'Paginated similar workshops for a factory profile',
    description:
      'Paginated similar workshops for a factory. Accepts factory business id or owner user id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Factory business id or factory owner user id',
    example: 'user-workshop',
  })
  similar(
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ): Promise<Paginated<BusinessResponse>> {
    return this.businesses.listSimilarFactories(id, query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary:
      'Public profile by business id, factory owner id, or individual user id',
    description:
      'Returns kind=factory for workshops, or kind=employee|marketer|shipping_company for those user ids (employee-like). For similar workshops use GET /profiles/:id/similar.',
  })
  @ApiParam({
    name: 'id',
    description:
      'Factory business/owner id, or employee/marketer/shipping_company user id',
    example: 'user-employee',
  })
  profile(@Param('id') id: string): Promise<PublicProfileResponse> {
    return this.businesses.publicProfile(id);
  }
}
