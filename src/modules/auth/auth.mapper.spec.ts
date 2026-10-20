import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { canOrder, toUserResponse } from './auth.mapper';

describe('canOrder', () => {
  it.each([
    [UserRole.store, true, true],
    [UserRole.workshop, true, true],
    [UserRole.store, false, false],
    [UserRole.workshop, false, false],
    [UserRole.employee, true, false],
    [UserRole.institute, true, false],
    [UserRole.marketer, true, false],
  ])('%s onboarded=%s → %s', (role, onboarded, expected) => {
    expect(canOrder(role, onboarded)).toBe(expected);
  });
});

const baseUser = {
  id: 'u1',
  role: UserRole.store,
  name: 'متجر',
  phone: '0994000004',
  email: null,
  passwordHash: null,
  bio: null,
  avatarUrl: null,
  availableForWork: true,
  verified: false,
  suspended: false,
  onboardingCompleted: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deliveryAddress: null,
  deliveryLat: null,
  deliveryLng: null,
  locationId: null as string | null,
  location: null as null | Record<string, unknown>,
};

describe('toUserResponse', () => {
  it('includes canOrder on the user payload', () => {
    expect(toUserResponse(baseUser as never).canOrder).toBe(true);
  });

  it('falls back to the default placeholder avatar when missing', () => {
    expect(toUserResponse(baseUser as never).avatarUrl).toBe(
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10',
    );
  });

  it('returns city deliveryBorder and locationId', () => {
    const user = {
      ...baseUser,
      locationId: 'loc-damascus',
      location: {
        id: 'loc-damascus',
        name: 'دمشق',
        parentId: null,
        sortOrder: 1,
        active: true,
        centerLat: 33.5138,
        centerLng: 36.2765,
        radiusKm: 18,
        createdAt: new Date(),
        parent: null,
      },
    };

    const response = toUserResponse(user as never);
    expect(response.location).toBe('دمشق');
    expect(response.locationId).toBe('loc-damascus');
    expect(response.deliveryBorder).toEqual({
      centerLat: 33.5138,
      centerLng: 36.2765,
      radiusKm: 18,
    });
  });

  it('resolves deliveryBorder from area parent city', () => {
    const user = {
      ...baseUser,
      locationId: 'loc-damascus-mazzeh',
      location: {
        id: 'loc-damascus-mazzeh',
        name: 'المزة',
        parentId: 'loc-damascus',
        sortOrder: 1,
        active: true,
        centerLat: null,
        centerLng: null,
        radiusKm: null,
        createdAt: new Date(),
        parent: {
          id: 'loc-damascus',
          name: 'دمشق',
          parentId: null,
          sortOrder: 1,
          active: true,
          centerLat: 33.5138,
          centerLng: 36.2765,
          radiusKm: 18,
          createdAt: new Date(),
        },
      },
    };

    const response = toUserResponse(user as never);
    expect(response.location).toBe('المزة');
    expect(response.locationId).toBe('loc-damascus-mazzeh');
    expect(response.deliveryBorder).toEqual({
      centerLat: 33.5138,
      centerLng: 36.2765,
      radiusKm: 18,
    });
  });

  it('returns null deliveryBorder when city has no circle', () => {
    const user = {
      ...baseUser,
      locationId: 'loc-remote',
      location: {
        id: 'loc-remote',
        name: 'عمل عن بعد',
        parentId: null,
        sortOrder: 16,
        active: true,
        centerLat: null,
        centerLng: null,
        radiusKm: null,
        createdAt: new Date(),
        parent: null,
      },
    };

    expect(toUserResponse(user as never).deliveryBorder).toBeNull();
  });
});
