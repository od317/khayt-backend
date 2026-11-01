import { ProductAudience, Prisma, UserRole } from '@prisma/client';

export function productAudiencesForRole(
  role?: UserRole,
): ProductAudience[] | undefined {
  if (role === UserRole.store) {
    return [ProductAudience.store, ProductAudience.both];
  }
  if (role === UserRole.workshop) {
    return [ProductAudience.workshop, ProductAudience.both];
  }
  return undefined;
}

export function productAudienceWhere(
  role?: UserRole,
): Prisma.ProductWhereInput {
  const audience = productAudiencesForRole(role);
  return audience ? { audience: { in: audience } } : {};
}
