import { HttpException, HttpStatus } from '@nestjs/common';

export function hasDisplayName(name: string | null | undefined): boolean {
  return typeof name === 'string' && name.trim().length >= 2;
}

export function hasDeliveryCoordinates(saved: {
  deliveryLat: number | null;
  deliveryLng: number | null;
}): boolean {
  return saved.deliveryLat !== null && saved.deliveryLng !== null;
}

export function throwProfileIncomplete(
  fields: Record<string, string>,
  message: string,
): never {
  throw new HttpException(
    {
      error: 'profile_incomplete',
      message,
      completedData: false,
      fields,
    },
    HttpStatus.FORBIDDEN,
  );
}

export function assertHasDisplayName(name: string | null | undefined): void {
  if (!hasDisplayName(name)) {
    throwProfileIncomplete(
      { name: 'required' },
      'Enter your name to continue',
    );
  }
}

export function assertHasDeliveryCoordinates(saved: {
  deliveryLat: number | null;
  deliveryLng: number | null;
}): void {
  if (!hasDeliveryCoordinates(saved)) {
    throwProfileIncomplete(
      { deliveryLat: 'required', deliveryLng: 'required' },
      'Enter your delivery location to continue',
    );
  }
}
