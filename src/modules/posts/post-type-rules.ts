import { PostType } from '@prisma/client';

/**
 * Per-type requirements for POST /posts.
 * Fields are the *required* ones for each type. All other fields are optional.
 * Source: the app's publish forms. Not yet in 04-api.md.
 */
export const POST_TYPE_REQUIRED_FIELDS: Record<PostType, readonly string[]> = {
  job_seeking: ['specialty', 'workType'],
  job_offering: ['specialty', 'workType'],
  service_offering: ['specialty'],
  service_requesting: ['specialty'],
  product_offering: ['price'],
  material_offering: ['specialty', 'condition'],
  material_requesting: ['specialty'],
  reel: [],
};
