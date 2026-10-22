import { Controller, Get } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RoleResponseDto } from './dto/role-response.dto';
import { RoleResponse, RolesService } from './roles.service';

@ApiTags('roles')
@ApiExtraModels(RoleResponseDto)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Public()
  @Get()
  @ApiSecurity({})
  @ApiOperation({
    summary: 'List selectable onboarding roles',
    description:
      'Public. Returns roles with label, Arabic description, and iconUrl for the app role picker.',
  })
  @ApiOkResponse({
    description: 'Selectable roles (`items` of RoleResponseDto)',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(RoleResponseDto) },
        },
      },
    },
  })
  list(): Promise<{ items: RoleResponse[] }> {
    return this.roles.list();
  }
}
