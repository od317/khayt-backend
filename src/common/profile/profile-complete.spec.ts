import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertHasDeliveryCoordinates,
  assertHasDisplayName,
  hasDeliveryCoordinates,
  hasDisplayName,
} from './profile-complete';

describe('profile-complete', () => {
  it.each([
    [null, false],
    [undefined, false],
    ['', false],
    [' ', false],
    ['أ', false],
    ['أحمد', true],
  ])('hasDisplayName(%j) → %s', (name, expected) => {
    expect(hasDisplayName(name)).toBe(expected);
  });

  it('assertHasDisplayName throws completedData=false', () => {
    try {
      assertHasDisplayName(null);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'profile_incomplete',
        completedData: false,
        fields: { name: 'required' },
      });
    }
  });

  it('hasDeliveryCoordinates requires both lat and lng', () => {
    expect(
      hasDeliveryCoordinates({ deliveryLat: null, deliveryLng: null }),
    ).toBe(false);
    expect(
      hasDeliveryCoordinates({ deliveryLat: 33.5, deliveryLng: null }),
    ).toBe(false);
    expect(
      hasDeliveryCoordinates({ deliveryLat: 33.5, deliveryLng: 36.2 }),
    ).toBe(true);
  });

  it('assertHasDeliveryCoordinates throws completedData=false', () => {
    try {
      assertHasDeliveryCoordinates({ deliveryLat: null, deliveryLng: null });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'profile_incomplete',
        completedData: false,
        fields: { deliveryLat: 'required', deliveryLng: 'required' },
      });
    }
  });
});
