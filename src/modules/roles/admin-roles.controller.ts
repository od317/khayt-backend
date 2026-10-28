import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AdminRoleResponse, RolesService } from './roles.service';

const roleIconStorage = diskStorage({
  destination: './uploads/role-icons',
  filename: (_req, file, callback) => {
    const extensionByMimeType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    callback(
      null,
      `${randomUUID()}${extensionByMimeType[file.mimetype] ?? '.bin'}`,
    );
  },
});

function roleIconFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    callback(
      new BadRequestException('صيغة الصورة يجب أن تكون PNG أو JPEG أو WebP'),
      false,
    );
    return;
  }
  callback(null, true);
}

@ApiTags('admin-roles')
@Controller('admin/roles')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminRolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles (including non-selectable)' })
  listAll(): Promise<{ items: AdminRoleResponse[] }> {
    return this.roles.listAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role' })
  create(@Body() dto: CreateRoleDto): Promise<{ role: AdminRoleResponse }> {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: roleIconStorage,
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: roleIconFileFilter,
    }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        description: { type: 'string' },
        iconUrl: { type: 'string' },
        icon: { type: 'string', format: 'binary' },
        visibleInApp: { type: 'boolean' },
        sortOrder: { type: 'integer' },
      },
    },
  })
  @ApiOperation({
    summary: 'Update role details and optionally upload its icon',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @UploadedFile() icon?: Express.Multer.File,
  ): Promise<{ role: AdminRoleResponse }> {
    return this.roles.update(
      id,
      icon ? { ...dto, iconUrl: `/uploads/role-icons/${icon.filename}` } : dto,
    );
  }

  @Patch(':id/icon')
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: roleIconStorage,
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: roleIconFileFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['icon'],
      properties: { icon: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Upload a role icon (use PATCH /admin/roles/:id to update role and icon together)',
  })
  uploadIcon(
    @Param('id') id: string,
    @UploadedFile() icon?: Express.Multer.File,
  ): Promise<{ role: AdminRoleResponse }> {
    if (!icon) {
      throw new BadRequestException(
        'ارفع أيقونة بصيغة PNG أو JPEG أو WebP (الحد الأقصى 8 ميغابايت)',
      );
    }

    return this.roles.update(id, {
      iconUrl: `/uploads/role-icons/${icon.filename}`,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a non-system role' })
  remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.roles.remove(id);
  }
}
