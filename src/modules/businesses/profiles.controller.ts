import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  BusinessesService,
  PublicProfileResponse,
} from './businesses.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly businesses: BusinessesService) {}

  /**
   * Public profile by:
   * - factory business id / factory owner user id → kind: factory
   * - employee user id → kind: employee
   */
  @Public()
  @Get(':id')
  profile(@Param('id') id: string): Promise<PublicProfileResponse> {
    return this.businesses.publicProfile(id);
  }
}
