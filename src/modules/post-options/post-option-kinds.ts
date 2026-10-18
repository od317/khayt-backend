import { PostOptionKind, PostType } from '@prisma/client';

/** Which option kinds each publish form needs. */
export const POST_OPTION_KINDS_BY_TYPE: Record<
  PostType,
  readonly PostOptionKind[]
> = {
  // workType / salaryType / experience stay on the post body as free text —
  // they are not catalog chips anymore.
  job_offering: [
    PostOptionKind.specialty,
    PostOptionKind.skill,
    PostOptionKind.currency,
  ],
  job_seeking: [
    PostOptionKind.specialty,
    PostOptionKind.skill,
    PostOptionKind.currency,
  ],
  service_offering: [
    PostOptionKind.specialty,
    PostOptionKind.service_place,
    PostOptionKind.pricing,
    PostOptionKind.currency,
  ],
  service_requesting: [PostOptionKind.specialty, PostOptionKind.currency],
  product_offering: [
    PostOptionKind.specialty,
    PostOptionKind.sell_method,
    PostOptionKind.price_method,
    PostOptionKind.currency,
  ],
  material_offering: [
    PostOptionKind.specialty,
    PostOptionKind.condition,
    PostOptionKind.currency,
  ],
  material_requesting: [
    PostOptionKind.specialty,
    PostOptionKind.condition,
    PostOptionKind.currency,
  ],
  reel: [],
};

/** Response field name for each option kind. */
export const POST_OPTION_FIELD_NAME: Record<PostOptionKind, string> = {
  specialty: 'specialty',
  skill: 'skills',
  work_type: 'workType',
  salary_type: 'salaryType',
  service_place: 'servicePlace',
  pricing: 'pricing',
  sell_method: 'sellMethod',
  price_method: 'priceMethod',
  condition: 'condition',
  currency: 'currency',
};
