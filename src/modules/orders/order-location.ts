export type DropoffLocation = {
  address: string;
  lat: number;
  lng: number;
};

/** Temporary defaults for VPS testing when the client omits drop-off. */
const DEFAULT_DROPOFF: DropoffLocation = {
  address: 'دمشق — موقع افتراضي للاختبار',
  lat: 33.5138,
  lng: 36.2765,
};

export function resolveOrderDropoff(
  dto: { address?: string; lat?: number; lng?: number },
  saved: {
    deliveryAddress: string | null;
    deliveryLat: number | null;
    deliveryLng: number | null;
  },
): { dropoff: DropoffLocation; persist: boolean } {
  const provided =
    dto.address !== undefined ||
    dto.lat !== undefined ||
    dto.lng !== undefined;

  if (provided) {
    const address =
      dto.address?.trim() && dto.address.trim().length >= 3
        ? dto.address.trim()
        : DEFAULT_DROPOFF.address;
    const lat =
      dto.lat !== undefined && dto.lat !== null
        ? dto.lat
        : DEFAULT_DROPOFF.lat;
    const lng =
      dto.lng !== undefined && dto.lng !== null
        ? dto.lng
        : DEFAULT_DROPOFF.lng;
    return {
      dropoff: { address, lat, lng },
      persist: true,
    };
  }

  if (
    saved.deliveryAddress &&
    saved.deliveryAddress.trim().length >= 3 &&
    saved.deliveryLat !== null &&
    saved.deliveryLng !== null
  ) {
    return {
      dropoff: {
        address: saved.deliveryAddress,
        lat: saved.deliveryLat,
        lng: saved.deliveryLng,
      },
      persist: false,
    };
  }

  // No body pin and no saved profile pin — use defaults (temporary for testing).
  return {
    dropoff: { ...DEFAULT_DROPOFF },
    persist: true,
  };
}
