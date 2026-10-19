import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LocationsService } from './locations.service';

type PrismaMock = {
  location: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const makeCity = (overrides: Record<string, unknown> = {}) => ({
  id: 'loc-damascus',
  name: 'دمشق',
  parentId: null,
  sortOrder: 1,
  active: true,
  centerLat: 33.5138,
  centerLng: 36.2765,
  radiusKm: 18,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  children: [],
  ...overrides,
});

describe('LocationsService', () => {
  let prisma: PrismaMock;
  let service: LocationsService;

  beforeEach(() => {
    prisma = {
      location: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new LocationsService(prisma as unknown as PrismaService);
  });

  it('returns cities with their areas nested', async () => {
    prisma.location.findMany.mockResolvedValue([
      makeCity({
        children: [
          { id: 'loc-damascus-mazzeh', name: 'المزة' },
          { id: 'loc-damascus-midan', name: 'الميدان' },
        ],
      }),
    ]);

    const result = await service.list();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('دمشق');
    expect(result.items[0]?.deliveryBorder).toEqual({
      centerLat: 33.5138,
      centerLng: 36.2765,
      radiusKm: 18,
    });
    expect(result.items[0]?.areas).toEqual([
      { id: 'loc-damascus-mazzeh', name: 'المزة' },
      { id: 'loc-damascus-midan', name: 'الميدان' },
    ]);
  });

  it('returns null deliveryBorder for cities without a circle', async () => {
    prisma.location.findMany.mockResolvedValue([
      makeCity({
        id: 'loc-remote',
        name: 'عمل عن بعد',
        centerLat: null,
        centerLng: null,
        radiusKm: null,
        children: [],
      }),
    ]);

    const result = await service.list();

    expect(result.items[0]?.deliveryBorder).toBeNull();
  });

  it('includes deliveryBorder on the flat cities list', async () => {
    prisma.location.findMany.mockResolvedValue([
      {
        id: 'loc-damascus',
        name: 'دمشق',
        centerLat: 33.5138,
        centerLng: 36.2765,
        radiusKm: 18,
      },
    ]);

    const result = await service.listCities();

    expect(prisma.location.findMany).toHaveBeenCalledWith({
      where: { parentId: null, active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        centerLat: true,
        centerLng: true,
        radiusKm: true,
      },
    });
    expect(result.items).toEqual([
      {
        id: 'loc-damascus',
        name: 'دمشق',
        deliveryBorder: {
          centerLat: 33.5138,
          centerLng: 36.2765,
          radiusKm: 18,
        },
      },
    ]);
  });

  it('does not return inactive locations', async () => {
    await service.list();

    expect(prisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: null, active: true },
        include: expect.objectContaining({
          children: expect.objectContaining({
            where: { active: true },
          }),
        }),
      }),
    );
  });

  it('returns an empty areas array for a city with no children', async () => {
    prisma.location.findMany.mockResolvedValue([
      makeCity({ id: 'loc-remote', name: 'عمل عن بعد', children: [] }),
    ]);

    const result = await service.list();

    expect(result.items[0]?.areas).toEqual([]);
  });

  it('sorts cities by sortOrder', async () => {
    await service.list();

    expect(prisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sortOrder: 'asc' },
      }),
    );
  });

  it('sorts areas by sortOrder', async () => {
    await service.list();

    expect(prisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          children: expect.objectContaining({
            orderBy: { sortOrder: 'asc' },
          }),
        }),
      }),
    );
  });

  it('creates a city when parentId is omitted', async () => {
    const created = makeCity({ id: 'loc-homs', name: 'حمص' });
    prisma.location.create.mockResolvedValue(created);

    const result = await service.create({ name: 'حمص' });

    expect(prisma.location.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'حمص',
          parentId: null,
          active: true,
        }),
      }),
    );
    expect(result.location.name).toBe('حمص');
    expect(result.location.parentId).toBeNull();
  });

  it('returns areas for a city location id', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'loc-damascus' });
    prisma.location.findMany.mockResolvedValue([
      { id: 'loc-damascus-mazzeh', name: 'المزة' },
      { id: 'loc-damascus-midan', name: 'الميدان' },
    ]);

    const result = await service.listAreas('loc-damascus');

    expect(prisma.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'loc-damascus', parentId: null, active: true },
      select: { id: true },
    });
    expect(prisma.location.findMany).toHaveBeenCalledWith({
      where: { parentId: 'loc-damascus', active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });
    expect(result.items).toEqual([
      { id: 'loc-damascus-mazzeh', name: 'المزة' },
      { id: 'loc-damascus-midan', name: 'الميدان' },
    ]);
  });

  it('rejects an unknown location id for areas', async () => {
    prisma.location.findFirst.mockResolvedValue(null);

    const error = await service
      .listAreas('missing')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(prisma.location.findMany).not.toHaveBeenCalled();
  });
});
