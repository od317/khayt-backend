import type { Location } from '@prisma/client';

export type DeliveryBorder = {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
};

export type LocationWithParent = Location & {
  parent?: Location | null;
};

/** City (or area's parent city) delivery circle, or null if unset. */
export function resolveDeliveryBorder(
  location: LocationWithParent | null | undefined,
): DeliveryBorder | null {
  if (!location) return null;

  const city =
    location.parentId && location.parent ? location.parent : location;

  // Areas without a loaded parent cannot resolve a border here.
  if (location.parentId && !location.parent) {
    return null;
  }

  if (
    city.centerLat === null ||
    city.centerLng === null ||
    city.radiusKm === null
  ) {
    return null;
  }

  return {
    centerLat: city.centerLat,
    centerLng: city.centerLng,
    radiusKm: city.radiusKm,
  };
}

export function toDeliveryBorder(
  location: Pick<Location, 'centerLat' | 'centerLng' | 'radiusKm'>,
): DeliveryBorder | null {
  if (
    location.centerLat === null ||
    location.centerLng === null ||
    location.radiusKm === null
  ) {
    return null;
  }
  return {
    centerLat: location.centerLat,
    centerLng: location.centerLng,
    radiusKm: location.radiusKm,
  };
}

/** Haversine distance in kilometers. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function isInsideDeliveryBorder(
  lat: number,
  lng: number,
  border: DeliveryBorder,
): boolean {
  return (
    distanceKm(border.centerLat, border.centerLng, lat, lng) <= border.radiusKm
  );
}
