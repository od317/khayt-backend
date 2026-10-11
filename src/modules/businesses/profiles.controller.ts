import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import {
  BusinessesService,
  PublicProfileResponse,
} from './businesses.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Public profile by business id, factory owner id, or employee id',
    description:
      'Returns kind=factory for workshops (business id or owner user id), or kind=employee for employee user ids.',
  })
  @ApiParam({
    name: 'id',
    description:
      'Factory business id (e.g. biz-workshop), factory owner id (e.g. user-workshop), or employee id (e.g. user-employee)',
    example: 'user-employee',
  })
  profile(@Param('id') id: string): Promise<PublicProfileResponse> {
    return this.businesses.publicProfile(id);
  }
}
