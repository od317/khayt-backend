import { describe, expect, it } from 'vitest';
import {
  distanceKm,
  isInsideDeliveryBorder,
  resolveDeliveryBorder,
  toDeliveryBorder,
} from './location-border';

const damascusBorder = {
  centerLat: 33.5138,
  centerLng: 36.2765,
  radiusKm: 18,
};

describe('toDeliveryBorder', () => {
  it('returns null when any field is missing', () => {
    expect(
      toDeliveryBorder({
        centerLat: 33.5,
        centerLng: 36.2,
        radiusKm: null,
      }),
    ).toBeNull();
  });

  it('returns the circle when all fields are set', () => {
    expect(toDeliveryBorder(damascusBorder)).toEqual(damascusBorder);
  });
});

describe('resolveDeliveryBorder', () => {
  it('returns the city border when location is a city', () => {
    expect(
      resolveDeliveryBorder({
        id: 'loc-damascus',
        name: 'دمشق',
        parentId: null,
        sortOrder: 1,
        active: true,
        createdAt: new Date(),
        ...damascusBorder,
      }),
    ).toEqual(damascusBorder);
  });

  it('returns the parent city border for an area', () => {
    expect(
      resolveDeliveryBorder({
        id: 'loc-mazzeh',
        name: 'المزة',
        parentId: 'loc-damascus',
        sortOrder: 1,
        active: true,
        createdAt: new Date(),
        centerLat: null,
        centerLng: null,
        radiusKm: null,
        parent: {
          id: 'loc-damascus',
          name: 'دمشق',
          parentId: null,
          sortOrder: 1,
          active: true,
          createdAt: new Date(),
          ...damascusBorder,
        },
      }),
    ).toEqual(damascusBorder);
  });

  it('returns null for an area when parent is not loaded', () => {
    expect(
      resolveDeliveryBorder({
        id: 'loc-mazzeh',
        name: 'المزة',
        parentId: 'loc-damascus',
        sortOrder: 1,
        active: true,
        createdAt: new Date(),
        centerLat: null,
        centerLng: null,
        radiusKm: null,
      }),
    ).toBeNull();
  });

  it('returns null when city has no border', () => {
    expect(
      resolveDeliveryBorder({
        id: 'loc-remote',
        name: 'عمل عن بعد',
        parentId: null,
        sortOrder: 16,
        active: true,
        createdAt: new Date(),
        centerLat: null,
        centerLng: null,
        radiusKm: null,
      }),
    ).toBeNull();
  });
});

describe('distanceKm / isInsideDeliveryBorder', () => {
  it('treats the center as inside', () => {
    expect(
      isInsideDeliveryBorder(
        damascusBorder.centerLat,
        damascusBorder.centerLng,
        damascusBorder,
      ),
    ).toBe(true);
  });

  it('accepts a point near the center', () => {
    expect(isInsideDeliveryBorder(33.52, 36.28, damascusBorder)).toBe(true);
  });

  it('rejects a point far outside the radius', () => {
    // Aleppo roughly ~300km from Damascus
    expect(isInsideDeliveryBorder(36.2021, 37.1343, damascusBorder)).toBe(
      false,
    );
  });

  it('computes a sane Haversine distance between Damascus and Aleppo', () => {
    const km = distanceKm(33.5138, 36.2765, 36.2021, 37.1343);
    expect(km).toBeGreaterThan(250);
    expect(km).toBeLessThan(400);
  });
});
