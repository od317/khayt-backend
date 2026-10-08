import { ShippingCompany } from '@prisma/client';

export type ShippingCompanyResponse = {
  id: string;
  name: string;
  location: string;
  verified: boolean;
  coverage: string[];
  deliveryTime: string;
  pricing: string | null;
  fleet: string | null;
  phone: string;
  createdAt: string;
};

export function toShippingCompanyResponse(
  company: ShippingCompany,
): ShippingCompanyResponse {
  return {
    id: company.id,
    name: company.name,
    location: company.location,
    verified: company.verified,
    coverage: company.coverage,
    deliveryTime: company.deliveryTime,
    pricing: company.pricing,
    fleet: company.fleet,
    phone: company.phone,
    createdAt: company.createdAt.toISOString(),
  };
}