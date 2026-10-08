import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Business,
  Location,
  CategoryApplies,
  MediaType,
  NotificationType,
  Post,
  PostType,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { AdminQueryPostsDto } from './dto/admin-query-posts.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PostOptionsService } from '../post-options/post-options.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { join } from 'node:path';
import { parse as parsePath } from 'node:path';
import { extractVideoThumbnail } from './post-thumbnails';
import {
  CommentResponse,
  PostCounts,
  PostResponse,
  toCommentResponse,
  PostWithRelationsForMapper,
  toPostResponse,
} from './posts.mapper';
import { POST_TYPES_BY_ROLE } from './post-role-map';
import { POST_TYPE_REQUIRED_FIELDS } from './post-type-rules';
import { postImagePaths, postVideoPath } from './post-uploads';

const POST_DISALLOWED_SCOPES: CategoryApplies[] = [
  CategoryApplies.product,
  CategoryApplies.business,
  CategoryApplies.workshop,
  CategoryApplies.institute,
  CategoryApplies.store,
  CategoryApplies.workshop_institute,
];

type PostWithRelations = PostWithRelationsForMapper;


/** Same as CreatePostDto but with a concrete `type`. Used internally. */
type ResolvedCreatePostDto = CreatePostDto & { type: PostType };

const POST_INCLUDE = {
  author: { include: { location: true } },
  business: true,
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      images: true,
      businessId: true,
      deletedAt: true,
    },
  },
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

/** Default type when the client omits it. */
const DEFAULT_POST_TYPE: PostType = PostType.job_seeking;

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly postOptions: PostOptionsService,
  ) { }

  async list(
    query: QueryPostsDto,
    actor: AuthenticatedUser | undefined,
  ): Promise<Paginated<PostResponse>> {
    const where: Prisma.PostWhereInput = { deletedAt: null };

    const activeFilter = query.active ?? 'true';
    const wantInactive = activeFilter === 'false';

    if (wantInactive) {
      if (!actor) {
        throw new UnauthorizedException({
          error: 'unauthorized',
          message: 'Authentication required to list inactive posts',
        });
      }
      where.active = false;
      where.authorId = actor.id;
    } else {
      where.active = true;
      if (query.authorId) where.authorId = query.authorId;
    }

    if (query.savedBy === 'me') {
      if (!actor) {
        throw new UnauthorizedException({
          error: 'unauthorized',
          message: 'Authentication required to list saved posts',
        });
      }
      where.savedBy = { some: { userId: actor.id } };
    }

    // ─────────────────────────────────────────────────────────
    // Post type filter — one block, one source of truth.
    // ─────────────────────────────────────────────────────────
    if (query.forMe === 'true') {
      if (!actor) {
        throw new UnauthorizedException({
          error: 'unauthorized',
          message: 'Authentication required to use forMe',
        });
      }

      const roleTypes = POST_TYPES_BY_ROLE[actor.role as UserRole] ?? [];
      if (roleTypes.length === 0) {
        return paginate([], 0, query.page, query.limit);
      }

      if (query.type && query.type.length > 0) {
        const allowed = query.type.filter((t) => roleTypes.includes(t));
        where.type = allowed.length > 0 ? { in: allowed } : { in: [] };
      } else {
        where.type = { in: roleTypes };
      }
    } else if (query.type && query.type.length > 0) {
      where.type = { in: query.type };
    } else {
      where.type = { not: PostType.reel };
    }
    // ─────────────────────────────────────────────────────────

    if (query.businessId) where.businessId = query.businessId;
    if (query.media) where.media = query.media;
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { body: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) {
      where.categories = { some: { categoryId: query.categoryId } };
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: POST_INCLUDE,
      }),
      this.prisma.post.count({ where }),
    ]);

    const items = await this.attachCounts(rows, actor);
    return paginate(items, total, query.page, query.limit);
  }

  async detail(
    id: string,
    actor: AuthenticatedUser | undefined,
  ): Promise<{ post: PostResponse }> {
    const post = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: POST_INCLUDE,
    });

    if (!post) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }

    const isAuthor = actor !== undefined && actor.id === post.authorId;
    if (!post.active && !isAuthor) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }

    const [response] = await this.attachCounts([post], actor);
    if (!response) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    return { post: response };
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreatePostDto,
    files: Express.Multer.File[] = [],
  ): Promise<{ post: PostResponse }> {
    // 1. Resolve the type first (defaults if client omitted it).
    const type: PostType = dto.type ?? DEFAULT_POST_TYPE;

    const uploadedImages = postImagePaths(files);
    const uploadedVideo = postVideoPath(files);
    const imageUrls =
      uploadedImages.length > 0 ? uploadedImages : (dto.imageUrls ?? []);
    const videoUrl = uploadedVideo ?? dto.videoUrl ?? undefined;
    const thumbnailUrl = await this.resolveReelThumbnail(type, files);
    const media =
      type === PostType.reel
        ? MediaType.video
        : uploadedImages.length > 0
          ? MediaType.image
          : (dto.media ??
            (imageUrls.length > 0 ? MediaType.image : MediaType.none));

    // 2. Build a "resolved" DTO with a concrete type for validators.
    const resolved: ResolvedCreatePostDto = {
      ...dto,
      type,
      imageUrls,
      videoUrl,
      media,
    };

    this.assertTypeRequirements(resolved);
    this.assertMediaRequirements(resolved);
    await this.assertOptionSelections(type, dto);

    if (dto.businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: dto.businessId },
        select: { ownerId: true },
      });
      if (!business || business.ownerId !== actor.id) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Not the owner of this business',
        });
      }
    }

    const categoryIds = [...new Set(dto.categoryIds ?? [])];
    if (categoryIds.length > 0) {
      await this.assertAssignableCategories(categoryIds);
    }

    let productId: string | null = null;
    if (dto.productId) {
      await this.assertCanLinkProduct(actor, dto.productId, dto.businessId);
      productId = dto.productId;
    }


    const post = await this.prisma.post.create({
      data: {
        authorId: actor.id,
        businessId: dto.businessId ?? null,
        type,                              // ✅ concrete PostType
        title: dto.title,
        body: dto.body,
        location: dto.location ?? null,    // ✅ nullable
        media,
        imageUrls,
        videoUrl: videoUrl ?? null,
        thumbnailUrl,
        specialty: dto.specialty ?? null,
        skills: dto.skills ?? [],
        workType: dto.workType ?? [],
        experience: dto.experience ?? null,
        salary: dto.salary ?? null,
        salaryType: dto.salaryType ?? null,
        pricing: dto.pricing ?? null,
        servicePlace: dto.servicePlace ?? null,
        sellMethod: dto.sellMethod ?? null,
        priceMethod: dto.priceMethod ?? null,
        condition: dto.condition ?? null,
        price: dto.price ?? null,
        productId,
        ...(categoryIds.length > 0
          ? {
            categories: {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }
          : {}),
      },
      include: POST_INCLUDE,
    });

    const [response] = await this.attachCounts([post], actor);
    if (!response) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    return { post: response };
  }

  async update(
    id: string,
    actor: AuthenticatedUser,
    dto: UpdatePostDto,
    files: Express.Multer.File[] = [],
  ): Promise<{ post: PostResponse }> {
    const existing = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true, type: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    if (existing.authorId !== actor.id) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Not the author of this post',
      });
    }

    if (dto.categoryIds !== undefined) {
      await this.assertAssignableCategories(dto.categoryIds);
    }

    const optionPatch = {
      specialty: dto.specialty,
      skills: dto.skills,
      workType: dto.workType,
      salaryType: dto.salaryType,
      servicePlace: dto.servicePlace,
      pricing: dto.pricing,
      sellMethod: dto.sellMethod,
      priceMethod: dto.priceMethod,
      condition: dto.condition,
    };
    const touchesOptions = Object.values(optionPatch).some(
      (v) => v !== undefined,
    );

    // ✅ Guard: only validate options if the post has a concrete type.
    if (touchesOptions && existing.type) {
      const current = await this.prisma.post.findFirst({
        where: { id, deletedAt: null },
        select: {
          specialty: true,
          skills: true,
          workType: true,
          salaryType: true,
          servicePlace: true,
          pricing: true,
          sellMethod: true,
          priceMethod: true,
          condition: true,
        },
      });
      await this.assertOptionSelections(existing.type, {
        specialty: dto.specialty ?? current?.specialty ?? undefined,
        skills: dto.skills ?? current?.skills,
        workType: dto.workType ?? current?.workType,
        salaryType: dto.salaryType ?? current?.salaryType ?? undefined,
        servicePlace: dto.servicePlace ?? current?.servicePlace ?? undefined,
        pricing: dto.pricing ?? current?.pricing ?? undefined,
        sellMethod: dto.sellMethod ?? current?.sellMethod ?? undefined,
        priceMethod: dto.priceMethod ?? current?.priceMethod ?? undefined,
        condition: dto.condition ?? current?.condition ?? undefined,
      });
    }

    let productPatch: Prisma.PostUpdateInput['product'] | undefined;
    if (dto.productId !== undefined) {
      if (dto.productId === null || dto.productId === '') {
        productPatch = { disconnect: true };
      } else {
        // businessId is immutable on a post — read it from the existing post
        // so we can enforce "product must belong to the same business".
        const existingPostBusinessId =
          await this.prisma.post.findFirst({
            where: { id, deletedAt: null },
            select: { businessId: true },
          });
        await this.assertCanLinkProduct(
          actor,
          dto.productId,
          existingPostBusinessId?.businessId ?? undefined,
        );
        productPatch = { connect: { id: dto.productId } };
      }
    }

    const uploadedImages = postImagePaths(files);
    const uploadedVideo = postVideoPath(files);
    const uploadedThumbnail = files.find((f) => f.fieldname === 'thumbnail');

    const post = await this.prisma.$transaction(
      async (tx): Promise<PostWithRelations> => {
        const data: Prisma.PostUpdateInput = {};
        if (dto.title !== undefined) data.title = dto.title;
        if (dto.body !== undefined) data.body = dto.body;
        if (dto.location !== undefined) data.location = dto.location;

        if (uploadedImages.length > 0) {
          data.imageUrls = uploadedImages;
          if (existing.type !== PostType.reel) {
            data.media = MediaType.image;
          }
        } else if (dto.imageUrls !== undefined) {
          data.imageUrls = dto.imageUrls;
        }
        if (uploadedVideo) {
          data.videoUrl = uploadedVideo;
          data.media = MediaType.video;
        } else if (dto.videoUrl !== undefined) {
          data.videoUrl = dto.videoUrl;
        }
        if (
          dto.media !== undefined &&
          uploadedImages.length === 0 &&
          !uploadedVideo
        ) {
          data.media = dto.media;
        }

        if (uploadedThumbnail) {
          data.thumbnailUrl = `/uploads/posts/${uploadedThumbnail.filename}`;
        } else if (uploadedVideo && existing.type === PostType.reel) {
          // A new video was uploaded for a reel → regenerate the thumbnail.
          const regenerated = await this.resolveReelThumbnail(
            PostType.reel,
            files,
          );
          if (regenerated) data.thumbnailUrl = regenerated;
        }

        if (dto.specialty !== undefined) data.specialty = dto.specialty;
        if (dto.skills !== undefined) data.skills = dto.skills;
        if (dto.workType !== undefined) data.workType = dto.workType;
        if (dto.experience !== undefined) data.experience = dto.experience;
        if (dto.salary !== undefined) data.salary = dto.salary;
        if (dto.salaryType !== undefined) data.salaryType = dto.salaryType;
        if (dto.pricing !== undefined) data.pricing = dto.pricing;
        if (dto.servicePlace !== undefined) data.servicePlace = dto.servicePlace;
        if (dto.sellMethod !== undefined) data.sellMethod = dto.sellMethod;
        if (dto.priceMethod !== undefined) data.priceMethod = dto.priceMethod;
        if (dto.condition !== undefined) data.condition = dto.condition;
        if (dto.price !== undefined) data.price = dto.price;
        if (dto.active !== undefined) data.active = dto.active;

        if (productPatch !== undefined) data.product = productPatch;

        if (dto.categoryIds !== undefined) {
          await tx.postCategory.deleteMany({ where: { postId: id } });
          if (dto.categoryIds.length > 0) {
            await tx.postCategory.createMany({
              data: [...new Set(dto.categoryIds)].map((categoryId) => ({
                postId: id,
                categoryId,
              })),
            });
          }
        }

        return tx.post.update({
          where: { id },
          data,
          include: POST_INCLUDE,
        });
      },
    );

    const [response] = await this.attachCounts([post], actor);
    if (!response) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    return { post: response };
  }

  async remove(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ post: PostResponse; deleted: true }> {
    const existing = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    if (existing.authorId !== actor.id) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Not the author of this post',
      });
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: POST_INCLUDE,
    });

    const [response] = await this.attachCounts([post], actor);
    if (!response) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    return { post: response, deleted: true };
  }

  async like(
    postId: string,
    actor: AuthenticatedUser,
  ): Promise<{ liked: true; likes: number }> {
    await this.assertPostVisible(postId);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId: actor.id, postId } },
      select: { userId: true },
    });

    await this.prisma.like.upsert({
      where: { userId_postId: { userId: actor.id, postId } },
      create: { userId: actor.id, postId },
      update: {},
    });
    const likes = await this.prisma.like.count({ where: { postId } });

    if (!existing && post && post.authorId !== actor.id) {
      const actorName = await this.getActorName(actor.id);
      await this.notifications.notifyLike({
        userId: post.authorId,
        actorId: actor.id,
        actorName,
        postId,
      });
    }

    return { liked: true, likes };
  }

  async unlike(
    postId: string,
    actor: AuthenticatedUser,
  ): Promise<{ liked: false; likes: number }> {
    await this.prisma.like.deleteMany({
      where: { userId: actor.id, postId },
    });
    const likes = await this.prisma.like.count({ where: { postId } });
    return { liked: false, likes };
  }

  async save(
    postId: string,
    actor: AuthenticatedUser,
  ): Promise<{ saved: true }> {
    await this.assertPostVisible(postId);
    await this.prisma.savedPost.upsert({
      where: { userId_postId: { userId: actor.id, postId } },
      create: { userId: actor.id, postId },
      update: {},
    });
    return { saved: true };
  }

  async unsave(
    postId: string,
    actor: AuthenticatedUser,
  ): Promise<{ saved: false }> {
    await this.prisma.savedPost.deleteMany({
      where: { userId: actor.id, postId },
    });
    return { saved: false };
  }

  async listComments(
    postId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<CommentResponse>> {
    await this.assertPostVisible(postId, { requireActive: false });

    const { skip, take } = skipTake(page, limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { postId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { author: true },
      }),
      this.prisma.comment.count({ where: { postId } }),
    ]);

    return paginate(rows.map(toCommentResponse), total, page, limit);
  }

  async createComment(
    postId: string,
    actor: AuthenticatedUser,
    dto: CreateCommentDto,
  ): Promise<{ comment: CommentResponse }> {
    await this.assertPostVisible(postId, { requireActive: true });

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    const comment = await this.prisma.comment.create({
      data: { postId, authorId: actor.id, body: dto.body },
      include: { author: true },
    });

    if (post && post.authorId !== actor.id) {
      const actorName = await this.getActorName(actor.id);
      await this.notifications.notify({
        userId: post.authorId,
        type: NotificationType.new_comment,
        title: 'تعليق جديد',
        body: `${actorName} علّق على منشورك`,
        linkTo: `/posts/${postId}`,
        actorId: actor.id,
      });
    }

    return { comment: toCommentResponse(comment) };
  }

  async deleteComment(
    commentId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { authorId: true } } },
    });

    if (!comment) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Comment not found',
      });
    }

    const isCommentAuthor = comment.authorId === actor.id;
    const isPostAuthor = comment.post.authorId === actor.id;
    if (!isCommentAuthor && !isPostAuthor) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Not the author of this comment or post',
      });
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name ?? userId;
  }

  private async assertPostVisible(
    postId: string,
    opts: { requireActive?: boolean } = {},
  ): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { active: true },
    });

    if (!post) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }

    if (opts.requireActive && !post.active) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
  }

  private async assertAssignableCategories(ids: string[]): Promise<void> {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) {
      return;
    }

    const rows = await this.prisma.category.findMany({
      where: { id: { in: unique } },
      select: { id: true, appliesTo: true },
    });

    if (rows.length !== unique.length) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'One or more categories do not exist',
          fields: { categoryIds: 'contains an unknown id' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const disallowed = rows.filter((row) =>
      POST_DISALLOWED_SCOPES.includes(row.appliesTo),
    );
    if (disallowed.length > 0) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'One or more categories cannot be used on posts',
          fields: { categoryIds: 'must apply to posts' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertCanLinkProduct(
    actor: AuthenticatedUser,
    productId: string,
    businessId: string | undefined,
  ): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        businessId: true,
        business: { select: { ownerId: true } },
      },
    });

    if (!product) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Product not found',
          fields: { productId: 'unknown product' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (businessId && product.businessId !== businessId) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Product belongs to a different business',
          fields: { productId: 'must belong to the same business as the post' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const isAdmin =
      actor.role === UserRole.admin || actor.role === UserRole.super_admin;
    if (!isAdmin && product.business.ownerId !== actor.id) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Cannot link a post to a product you do not own',
      });
    }
  }

  // ✅ Signature tightened: type is guaranteed at this point.
  private assertTypeRequirements(dto: ResolvedCreatePostDto): void {
    const required = POST_TYPE_REQUIRED_FIELDS[dto.type];
    const fields: Record<string, string> = {};

    for (const field of required) {
      const value = dto[field as keyof CreatePostDto];
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);
      if (empty) {
        fields[field] = `${field} is required for ${dto.type}`;
      }
    }

    if (Object.keys(fields).length > 0) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Missing type-specific fields',
          fields,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertOptionSelections(
    type: PostType,
    values: {
      specialty?: string;
      skills?: string[];
      workType?: string[];
      salaryType?: string;
      servicePlace?: string;
      pricing?: string;
      sellMethod?: string;
      priceMethod?: string;
      condition?: string;
    },
  ): Promise<void> {
    const fields = await this.postOptions.validateSelections(type, values);
    if (Object.keys(fields).length > 0) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'One or more values are not valid post options',
          fields,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ✅ Signature tightened: type is guaranteed at this point.
  private assertMediaRequirements(dto: ResolvedCreatePostDto): void {
    const media =
      dto.type === PostType.reel
        ? MediaType.video
        : (dto.media ?? MediaType.none);
    const fields: Record<string, string> = {};

    if (dto.type === PostType.reel || media === MediaType.video) {
      if (!dto.videoUrl || dto.videoUrl.trim() === '') {
        fields.videoUrl = 'videoUrl is required when media is video';
      }
    }

    if (media === MediaType.image) {
      if (!dto.imageUrls || dto.imageUrls.length === 0) {
        fields.imageUrls = 'imageUrls is required when media is image';
      }
    }

    if (Object.keys(fields).length > 0) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Invalid media configuration',
          fields,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async adminList(
    query: AdminQueryPostsDto,
  ): Promise<Paginated<PostResponse>> {
    const where: Prisma.PostWhereInput = {};

    // By default, hide soft-deleted. Admins can include them.
    if (query.includeDeleted !== 'true') {
      where.deletedAt = null;
    }

    // Active filter — if not specified, admins see BOTH active and inactive.
    if (query.active === 'true') where.active = true;
    if (query.active === 'false') where.active = false;

    if (query.type && query.type.length > 0) {
      where.type = { in: query.type };
    }
    if (query.authorId) where.authorId = query.authorId;
    if (query.businessId) where.businessId = query.businessId;
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { body: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: POST_INCLUDE,
      }),
      this.prisma.post.count({ where }),
    ]);

    const items = await this.attachCounts(rows, undefined);
    return paginate(items, total, query.page, query.limit);
  }

  async adminRemove(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ post: PostResponse; deleted: true }> {
    const existing = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: POST_INCLUDE,
    });

    // Notify the author (fire-and-forget; never blocks the response)
    if (existing.authorId !== actor.id) {
      void this.notifications.notify({
        userId: existing.authorId,
        type: NotificationType.post_moderated, // see note below
        title: 'تم حذف منشورك',
        body: 'قام فريق الإدارة بحذف أحد منشوراتك لمخالفته سياسات المنصة.',
        linkTo: '/posts',
        actorId: actor.id,
      });
    }

    const [response] = await this.attachCounts([post], actor);
    if (!response) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    return { post: response, deleted: true };
  }

  async adminSetActive(
    id: string,
    active: boolean,
    actor: AuthenticatedUser,
  ): Promise<{ post: PostResponse }> {
    const existing = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true, active: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }

    // No-op if the state doesn't change
    if (existing.active === active) {
      const current = await this.prisma.post.findFirst({
        where: { id, deletedAt: null },
        include: POST_INCLUDE,
      });
      if (!current) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Post not found',
        });
      }
      const [response] = await this.attachCounts([current], actor);
      return { post: response! };
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: { active },
      include: POST_INCLUDE,
    });

    // Notify the author (fire-and-forget)
    if (existing.authorId !== actor.id) {
      void this.notifications.notify({
        userId: existing.authorId,
        type: NotificationType.new_comment, // see note below
        title: active ? 'تم تفعيل منشورك' : 'تم تعطيل منشورك',
        body: active
          ? 'قام فريق الإدارة بإعادة تفعيل أحد منشوراتك.'
          : 'قام فريق الإدارة بتعطيل أحد منشوراتك مؤقتاً. لن يظهر للآخرين.',
        linkTo: `/posts/${id}`,
        actorId: actor.id,
      });
    }

    const [response] = await this.attachCounts([post], actor);
    if (!response) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post not found',
      });
    }
    return { post: response };
  }

  /**
 * Determines the thumbnail URL for a post.
 *
 * 1. If the client uploaded a file with fieldname `thumbnail`, that wins.
 * 2. Otherwise, if the post is a reel and a video file is present, we
 *    extract a frame with ffmpeg (installed in the container).
 * 3. Otherwise, null.
 *
 * Never throws — the extraction helper handles its own errors and logs
 * a warning on failure.
 */
  private async resolveReelThumbnail(
    type: PostType,
    files: Express.Multer.File[],
  ): Promise<string | null> {
    const custom = files.find((f) => f.fieldname === 'thumbnail');
    if (custom) {
      this.logger.log(`Using custom thumbnail for reel: ${custom.filename}`);
      return `/uploads/posts/${custom.filename}`;
    }

    if (type !== PostType.reel) return null;

    const video = files.find((f) => f.fieldname === 'video');
    if (!video) return null;

    const videoPath = join('./uploads/posts', video.filename);
    const base = parsePath(video.filename).name;
    const thumbFilename = `${base}.thumb.jpg`;
    const thumbPath = join('./uploads/posts', thumbFilename);

    const ok = await extractVideoThumbnail(videoPath, thumbPath, {
      scale: '-1:720', // portrait reels
    });

    return ok ? `/uploads/posts/${thumbFilename}` : null;
  }

  private async attachCounts(
    posts: PostWithRelations[],
    actor: AuthenticatedUser | undefined,
  ): Promise<PostResponse[]> {
    if (posts.length === 0) {
      return [];
    }

    const postIds = posts.map((p) => p.id);

    const [likeCounts, commentCounts, likedByMe, savedByMe] = await Promise.all(
      [
        this.prisma.like.groupBy({
          by: ['postId'],
          where: { postId: { in: postIds } },
          _count: { _all: true },
        }),
        this.prisma.comment.groupBy({
          by: ['postId'],
          where: { postId: { in: postIds } },
          _count: { _all: true },
        }),
        actor
          ? this.prisma.like.findMany({
            where: { userId: actor.id, postId: { in: postIds } },
            select: { postId: true },
          })
          : Promise.resolve([] as { postId: string }[]),
        actor
          ? this.prisma.savedPost.findMany({
            where: { userId: actor.id, postId: { in: postIds } },
            select: { postId: true },
          })
          : Promise.resolve([] as { postId: string }[]),
      ],
    );

    const likeMap = new Map(likeCounts.map((r) => [r.postId, r._count._all]));
    const commentMap = new Map(
      commentCounts.map((r) => [r.postId, r._count._all]),
    );
    const likedSet = new Set(likedByMe.map((r) => r.postId));
    const savedSet = new Set(savedByMe.map((r) => r.postId));

    return posts.map((post) => {
      const counts: PostCounts = {
        likes: likeMap.get(post.id) ?? 0,
        comments: commentMap.get(post.id) ?? 0,
        likedByMe: likedSet.has(post.id),
        savedByMe: savedSet.has(post.id),
      };
      return toPostResponse(post, counts);
    });
  }
}