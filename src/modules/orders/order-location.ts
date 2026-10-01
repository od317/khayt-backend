import { HttpException, HttpStatus } from '@nestjs/common';

export type DropoffLocation = {
  address: string;
  lat: number;
  lng: number;
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
    const address = dto.address?.trim() ?? '';
    const fields: Record<string, string> = {};
    if (address.length < 3) fields.address = 'required';
    if (dto.lat === undefined || dto.lat === null) fields.lat = 'required';
    if (dto.lng === undefined || dto.lng === null) fields.lng = 'required';
    if (Object.keys(fields).length > 0) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Map pin and address are required together',
          fields,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      dropoff: { address, lat: dto.lat as number, lng: dto.lng as number },
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

  throw new HttpException(
    {
      error: 'validation_failed',
      message:
        'Pick your delivery location on the map for the first order',
      fields: {
        address: 'required',
        lat: 'required',
        lng: 'required',
      },
    },
    HttpStatus.BAD_REQUEST,
  );
}
