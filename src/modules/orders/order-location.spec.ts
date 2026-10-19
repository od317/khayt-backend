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

  it('fills Damascus defaults when no pin is sent or saved', () => {
    const result = resolveOrderDropoff(
      {},
      { deliveryAddress: null, deliveryLat: null, deliveryLng: null },
    );
    expect(result.persist).toBe(true);
    expect(result.dropoff).toEqual({
      address: 'دمشق — موقع افتراضي للاختبار',
      lat: 33.5138,
      lng: 36.2765,
    });
  });

  it('fills missing fields from a partial request with defaults', () => {
    const result = resolveOrderDropoff(
      { lat: 33.1 },
      { deliveryAddress: null, deliveryLat: null, deliveryLng: null },
    );
    expect(result.persist).toBe(true);
    expect(result.dropoff.lat).toBe(33.1);
    expect(result.dropoff.lng).toBe(36.2765);
    expect(result.dropoff.address).toBe('دمشق — موقع افتراضي للاختبار');
  });
});
