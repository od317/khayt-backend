import { PostType, UserRole } from '@prisma/client';

/**
 * Which post types are "relevant" for each public role.
 * Used by GET /posts?forMe=true to build the user's personalized feed.
 *
 * Internal roles (admin, super_admin, inventory, delivery) have no entry —
 * forMe returns nothing for them, since their work happens elsewhere.
 */
export const POST_TYPES_BY_ROLE: Record<UserRole, PostType[]> = {
    [UserRole.employee]: [
        PostType.job_offering,
        PostType.service_requesting,
    ],
    [UserRole.workshop]: [
        PostType.job_seeking,
        PostType.material_offering,
        PostType.material_requesting,
    ],
    [UserRole.institute]: [
        PostType.job_seeking,
        PostType.service_offering,
    ],
    [UserRole.store]: [
        PostType.product_offering,
        PostType.material_offering,
    ],
    // Internal roles — no personalized feed defined.
    [UserRole.super_admin]: [],
    [UserRole.admin]: [],
    [UserRole.inventory]: [],
    [UserRole.delivery]: [],
};