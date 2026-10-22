import {
  Business,
  BusinessType,
  Location,
  MediaType,
  Post,
  PostType,
  Product,
  User,
  UserRole,
} from '@prisma/client';

export type PostAuthorResponse = {
  id: string;
  name: string | null;
  role: UserRole;
  location: string | null;
  avatarUrl: string | null;
};

export type PostBusinessResponse = {
  id: string;
  name: string;
  type: BusinessType;
  location: string;
  verified: boolean;
};

export type PostCategoryResponse = {
  id: string;
  name: string;
  slug: string;
};

export type PostProductResponse = {
  id: string;
  name: string;
  price: number;
  images: string[];
};


export type PostResponse = {
  id: string;
  type: PostType | null;
  title: string | null;
  body: string;
  media: MediaType;
  imageUrls: string[];
  videoUrl: string | null;
  thumbnailUrl: string | null;
  location: string | null;
  active: boolean;
  /** pending | approved | rejected — public feed only shows approved. */
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  specialty: string | null;
  skills: string[];
  workType: string[];
  experience: string | null;
  salary: string | null;
  salaryType: string | null;
  pricing: string | null;
  servicePlace: string | null;
  sellMethod: string | null;
  priceMethod: string | null;
  condition: string | null;
  price: string | null;
  currency: string | null;
  categories: PostCategoryResponse[];
  author: PostAuthorResponse;
  business: PostBusinessResponse | null;
  likes: number;
  comments: number;
  likedByMe: boolean;
  savedByMe: boolean;
  product: PostProductResponse | null;
};

export type CommentAuthorResponse = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type CommentResponse = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  author: CommentAuthorResponse;
  replies: CommentResponse[];
};

export type CommentWithAuthor = {
  id: string;
  body: string;
  createdAt: Date;
  parentId: string | null;
  author: User;
};

export type PostCounts = {
  likes: number;
  comments: number;
  likedByMe: boolean;
  savedByMe: boolean;
};


export type PostResponseProduct = {
  id: string;
  name: string;
  price: number;
  images: string[];
  deletedAt: Date | null;
};

export type PostWithRelationsForMapper = Post & {
  author: User & { location: Location | null };
  business: Business | null;
  product?: PostResponseProduct | null;
  categories?: { category: { id: string; name: string; slug: string } }[];
};

export function toPostAuthorResponse(
  user: User & { location: Location | null },
): PostAuthorResponse {
  return {
    id: user.id,
    name: user.name,
    role: user.role as UserRole,
    location: user.location?.name ?? null,
    avatarUrl: user.avatarUrl,
  };
}

export function toPostBusinessResponse(
  business: Business,
): PostBusinessResponse {
  return {
    id: business.id,
    name: business.name,
    type: business.type,
    location: business.location,
    verified: business.verified,
  };
}

export function toPostResponse(
  post: PostWithRelationsForMapper,
  counts: PostCounts,
): PostResponse {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    body: post.body,
    media: post.media,
    imageUrls: post.imageUrls,
    videoUrl: post.videoUrl,
    thumbnailUrl: post.thumbnailUrl,
    location: post.location,
    active: post.active,
    approvalStatus: post.approvalStatus,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    specialty: post.specialty,
    skills: post.skills,
    workType: post.workType,
    experience: post.experience,
    salary: post.salary,
    salaryType: post.salaryType,
    pricing: post.pricing,
    servicePlace: post.servicePlace,
    sellMethod: post.sellMethod,
    priceMethod: post.priceMethod,
    condition: post.condition,
    price: post.price,
    currency: post.currency,
    categories: (post.categories ?? []).map((row) => ({
      id: row.category.id,
      name: row.category.name,
      slug: row.category.slug,
    })),
    author: toPostAuthorResponse(post.author),
    business: post.business ? toPostBusinessResponse(post.business) : null,
    likes: counts.likes,
    comments: counts.comments,
    likedByMe: counts.likedByMe,
    savedByMe: counts.savedByMe,
    product: post.product
      ? {
        id: post.product.id,
        name: post.product.name,
        price: post.product.price,
        images: post.product.images,
      }
      : null,
  };
}

export function toCommentResponse(
  comment: CommentWithAuthor,
  replies: CommentResponse[] = [],
): CommentResponse {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    parentId: comment.parentId,
    author: {
      id: comment.author.id,
      name: comment.author.name,
      avatarUrl: comment.author.avatarUrl,
    },
    replies,
  };
}

/** Build a nested reply tree. Roots = comments whose parentId is `rootParentId`. */
export function buildCommentTree(
  comments: CommentWithAuthor[],
  rootParentId: string | null = null,
): CommentResponse[] {
  const byParent = new Map<string | null, CommentWithAuthor[]>();
  for (const comment of comments) {
    const key = comment.parentId;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(comment);
    else byParent.set(key, [comment]);
  }

  const nest = (parentId: string | null): CommentResponse[] => {
    const children = byParent.get(parentId) ?? [];
    return children.map((child) => toCommentResponse(child, nest(child.id)));
  };

  return nest(rootParentId);
}
