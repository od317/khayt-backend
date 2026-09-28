import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RoleResponse, RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Public()
  @Get()
  list(): { items: RoleResponse[] } {
    return this.roles.list();
  }
}
