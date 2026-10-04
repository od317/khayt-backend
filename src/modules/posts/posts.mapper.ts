import {
  Business,
  BusinessType,
  Location,
  MediaType,
  Post,
  PostType,
  User,
  UserRole,
} from '@prisma/client';

export type PostAuthorResponse = {
  id: string;
  name: string;
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

export type PostResponse = {
  id: string;
  type: PostType;
  title: string | null;
  body: string;
  media: MediaType;
  imageUrls: string[];
  videoUrl: string | null;
  location: string;
  active: boolean;
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
  categories: PostCategoryResponse[];
  author: PostAuthorResponse;
  business: PostBusinessResponse | null;
  likes: number;
  comments: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

export type CommentAuthorResponse = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type CommentResponse = {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthorResponse;
};

export type PostCounts = {
  likes: number;
  comments: number;
  likedByMe: boolean;
  savedByMe: boolean;
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
  post: Post & {
    author: User & { location: Location | null };
    business: Business | null;
    categories?: { category: { id: string; name: string; slug: string } }[];
  },
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
    location: post.location,
    active: post.active,
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
  };
}

export function toCommentResponse(comment: {
  id: string;
  body: string;
  createdAt: Date;
  author: User;
}): CommentResponse {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.author.id,
      name: comment.author.name,
      avatarUrl: comment.author.avatarUrl,
    },
  };
}
