import { PostType } from '@prisma/client';

/**
 * Per-type requirements for POST /posts.
 * Fields are the *required* ones for each type. All other fields are optional.
 * Source: the app's publish forms.
 */
export const POST_TYPE_REQUIRED_FIELDS: Record<PostType, readonly string[]> = {
  job_seeking: ['specialty', 'workType'],
  job_offering: ['specialty', 'skills', 'workType', 'salaryType'],
  service_offering: ['specialty', 'servicePlace', 'pricing'],
  service_requesting: ['specialty'],
  product_offering: ['specialty', 'sellMethod', 'priceMethod'],
  material_offering: ['specialty', 'condition'],
  material_requesting: ['specialty'],
  reel: [],
};
