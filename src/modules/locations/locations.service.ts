import { Injectable } from '@nestjs/common';
import { Location } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

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
}
