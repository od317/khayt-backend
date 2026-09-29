import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Location, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

export type AreaResponse = {
  id: string;
  name: string;
};

export type CityResponse = {
  id: string;
  name: string;
  areas: AreaResponse[];
};

export type CityFlatResponse = {
  id: string;
  name: string;
};

export type AdminLocationResponse = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  areas: AdminLocationResponse[];
};

type LocationRow = Location & {
  children?: Location[];
};

export function toAdminLocation(
  location: LocationRow,
): AdminLocationResponse {
  return {
    id: location.id,
    name: location.name,
    parentId: location.parentId,
    sortOrder: location.sortOrder,
    active: location.active,
    areas: (location.children ?? []).map((child) => toAdminLocation(child)),
  };
}

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ items: CityResponse[] }> {
    const cities = await this.prisma.location.findMany({
      where: { parentId: null, active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true },
        },
      },
    });

    return {
      items: cities.map((city) => ({
        id: city.id,
        name: city.name,
        areas: city.children.map((area) => ({
          id: area.id,
          name: area.name,
        })),
      })),
    };
  }

  async listCities(): Promise<{ items: CityFlatResponse[] }> {
    const cities = await this.prisma.location.findMany({
      where: { parentId: null, active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });

    return { items: cities };
  }

  async listAll(): Promise<{ items: AdminLocationResponse[] }> {
    const cities = await this.prisma.location.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return { items: cities.map(toAdminLocation) };
  }

  async create(
    dto: CreateLocationDto,
  ): Promise<{ location: AdminLocationResponse }> {
    const parentId = dto.parentId ?? null;
    if (parentId) {
      await this.assertCityParent(parentId);
    }

    const location = await this.prisma.location.create({
      data: {
        name: dto.name,
        parentId,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
    });

    return { location: toAdminLocation(location) };
  }

  async update(
    id: string,
    dto: UpdateLocationDto,
  ): Promise<{ location: AdminLocationResponse }> {
    const existing = await this.prisma.location.findUnique({
      where: { id },
      include: { children: { select: { id: true } } },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Location not found',
      });
    }

    if (dto.parentId !== undefined) {
      const parentId = dto.parentId;
      if (parentId === id) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'A location cannot be its own parent',
            fields: { parentId: 'cannot reference itself' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (parentId) {
        await this.assertCityParent(parentId);
      }
      if (parentId && existing.children.length > 0) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'A city with areas cannot become an area',
            fields: { parentId: 'remove child areas first' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const data: Prisma.LocationUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.parentId !== undefined) {
      data.parent =
        dto.parentId === null
          ? { disconnect: true }
          : { connect: { id: dto.parentId } };
    }

    const location = await this.prisma.location.update({
      where: { id },
      data,
      include: { children: { orderBy: { sortOrder: 'asc' } } },
    });

    return { location: toAdminLocation(location) };
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.location.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        _count: { select: { users: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Location not found',
      });
    }

    if (existing.children.length > 0) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Delete or move child areas first',
      });
    }

    if (existing._count.users > 0) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Location is assigned to one or more users',
      });
    }

    await this.prisma.location.delete({ where: { id } });
    return { success: true };
  }

  private async assertCityParent(parentId: string): Promise<void> {
    const parent = await this.prisma.location.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Parent location does not exist',
          fields: { parentId: 'must reference an existing city' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (parent.parentId !== null) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Areas can only be nested under a city',
          fields: { parentId: 'must be a city, not an area' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
