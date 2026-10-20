import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Paginated } from '../../common/utils/pagination';
import { QueryMarketersDto } from './dto/query-marketers.dto';
import {
  BusinessesService,
  PublicEmployeeCard,
} from './businesses.service';

@ApiTags('marketers')
@Controller('marketers')
export class MarketersController {
  constructor(private readonly businesses: BusinessesService) {}

  @Public()
  @Get()
  @ApiSecurity({})
  @ApiOperation({
    summary: 'List marketers',
    description:
      'Public directory of onboarded marketers. Filters: q (name/bio), location, verified, availableForWork.',
  })
  @ApiOkResponse({ description: 'Paginated list of marketers' })
  list(
    @Query() query: QueryMarketersDto,
  ): Promise<Paginated<PublicEmployeeCard>> {
    return this.businesses.listMarketers(query);
  }
}
