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

describe('toUserResponse', () => {
  it('includes canOrder on the user payload', () => {
    const user = {
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
      locationId: null,
      location: null,
    };

    expect(toUserResponse(user).canOrder).toBe(true);
  });
});
