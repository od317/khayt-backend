import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

export type RoleResponse = {
  value: string;
  label: string;
  description: string;
};

export type AdminRoleResponse = RoleResponse & {
  id: string;
  visibleInApp: boolean;
  system: boolean;
  sortOrder: number;
};

export function toPublicRole(role: Role): RoleResponse {
  return {
    value: role.value,
    label: role.label,
    description: role.description ?? '',
  };
}

export function toAdminRole(role: Role): AdminRoleResponse {
  return {
    ...toPublicRole(role),
    id: role.id,
    visibleInApp: role.selectable,
    system: role.system,
    sortOrder: role.sortOrder,
  };
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ items: RoleResponse[] }> {
    const rows = await this.prisma.role.findMany({
      where: { selectable: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return { items: rows.map(toPublicRole) };
  }

  async listAll(): Promise<{ items: AdminRoleResponse[] }> {
    const rows = await this.prisma.role.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return { items: rows.map(toAdminRole) };
  }

  async create(dto: CreateRoleDto): Promise<{ role: AdminRoleResponse }> {
    try {
      const role = await this.prisma.role.create({
        data: {
          value: dto.value,
          label: dto.label,
          description: dto.description ?? '',
          selectable: dto.visibleInApp,
          sortOrder: dto.sortOrder ?? 50,
          system: false,
        },
      });
      return { role: toAdminRole(role) };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          error: 'conflict',
          message: 'A role with this value already exists',
        });
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
  ): Promise<{ role: AdminRoleResponse }> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Role not found',
      });
    }

    const data: Prisma.RoleUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.visibleInApp !== undefined) data.selectable = dto.visibleInApp;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const role = await this.prisma.role.update({ where: { id }, data });
    return { role: toAdminRole(role) };
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Role not found',
      });
    }

    if (existing.system) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'System roles cannot be deleted',
      });
    }

    const inUse = await this.prisma.user.count({
      where: { role: existing.value },
    });
    if (inUse > 0) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Role is assigned to one or more users',
      });
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
