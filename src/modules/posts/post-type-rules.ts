import { PostType } from '@prisma/client';

/**
 * Per-type requirements for POST /posts.
 * Fields listed here are *required* when a post is created with that type.
 *
 * NOTE: All type-specific fields (including specialty) are optional —
 * `body` is the only required field (CreatePostDto). This map exists so
 * you can re-introduce per-type requirements later without touching the
 * service layer.
 */
export const POST_TYPE_REQUIRED_FIELDS: Record<PostType, readonly string[]> = {
  job_seeking: [],
  job_offering: [],
  service_offering: [],
  service_requesting: [],
  product_offering: [],
  material_offering: [],
  material_requesting: [],
  reel: [],
};