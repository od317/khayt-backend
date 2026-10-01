import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { resolveOrderDropoff } from './order-location';

describe('resolveOrderDropoff', () => {
  it('uses the pin from the request and marks it to persist', () => {
    const result = resolveOrderDropoff(
      { address: 'شارع بغداد', lat: 33.5, lng: 36.2 },
      { deliveryAddress: null, deliveryLat: null, deliveryLng: null },
    );
    expect(result.persist).toBe(true);
    expect(result.dropoff).toEqual({
      address: 'شارع بغداد',
      lat: 33.5,
      lng: 36.2,
    });
  });

  it('reuses the saved pin when the request omits location', () => {
    const result = resolveOrderDropoff(
      {},
      {
        deliveryAddress: 'شارع بغداد',
        deliveryLat: 33.5,
        deliveryLng: 36.2,
      },
    );
    expect(result.persist).toBe(false);
    expect(result.dropoff.address).toBe('شارع بغداد');
  });

  it('rejects the first order with no pin', () => {
    expect(() =>
      resolveOrderDropoff(
        {},
        { deliveryAddress: null, deliveryLat: null, deliveryLng: null },
      ),
    ).toThrow(HttpException);
  });
});
