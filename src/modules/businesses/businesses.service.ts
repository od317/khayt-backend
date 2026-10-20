import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Business,
  BusinessType,
  CategoryApplies,
  Location,
  PostType,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { withDefaultAvatar } from '../../common/defaults/images';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { BusinessResponse, toBusinessResponse } from './businesses.mapper';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { QueryBusinessesDto } from './dto/query-businesses.dto';
import { QueryMarketersDto } from './dto/query-marketers.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import {
  isEmployeeLikeRole,
  toEmployeeLikeRole,
  type EmployeeLikeRole,
} from '../../common/roles/employee-like';
import {
  PostCounts,
  PostResponse,
  PostWithRelationsForMapper,
  toPostResponse,
} from '../posts/posts.mapper';

const BUSINESS_CATEGORY_SCOPES: CategoryApplies[] = [
  CategoryApplies.business,
  CategoryApplies.workshop,
  CategoryApplies.institute,
  CategoryApplies.store,
];

const FACTORY_POSTS_LIMIT = 20;

export type BusinessDetailResponse = {
  business: BusinessResponse;
  isOwner: boolean;
};

export type PublicFactoryProfileResponse = {
  kind: 'factory';
  /** Business id (canonical), even if the request used the owner user id. */
  id: string;
  profile: {
    name: string;
    description: string | null;
    verified: boolean;
    services: string[];
    imageUrl: string | null;
    location: string;
    phone: string | null;
    experience: string | null;
    categories: BusinessResponse['categories'];
  };
  posts: PostResponse[];
};

export type PublicEmployeeCard = {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  availableForWork: boolean;
  location: string | null;
};

export type PublicEmployeeProfileResponse = {
  kind: 'employee' | 'marketer' | 'shipping_company';
  id: string;
  profile: PublicEmployeeCard & {
    phone: string | null;
    role: 'employee' | 'marketer' | 'shipping_company';
  };
  posts: PostResponse[];
  similar: PublicEmployeeCard[];
};

export type PublicProfileResponse =
  | PublicFactoryProfileResponse
  | PublicEmployeeProfileResponse;

const EMPLOYEE_POSTS_LIMIT = 20;
const SIMILAR_EMPLOYEES_LIMIT = 6;

const BUSINESS_INCLUDE = {
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

const FACTORY_POST_INCLUDE = {
  author: { include: { location: true } },
  business: true,
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      images: true,
      deletedAt: true,
    },
  },
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) { }

  async listMarketers(
    query: QueryMarketersDto,
  ): Promise<Paginated<PublicEmployeeCard>> {
    const where: Prisma.UserWhereInput = {
      role: UserRole.marketer,
      suspended: false,
      onboardingCompleted: true,
    };

    if (query.location) {
      where.location = {
        name: { contains: query.location, mode: 'insensitive' },
      };
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { bio: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.verified === 'true') where.verified = true;
    if (query.verified === 'false') where.verified = false;

    if (query.availableForWork === 'true') where.availableForWork = true;
    if (query.availableForWork === 'false') where.availableForWork = false;

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: { location: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        bio: row.bio,
        avatarUrl: withDefaultAvatar(row.avatarUrl),
        verified: row.verified,
        availableForWork: row.availableForWork,
        location: row.location?.name ?? null,
      })),
      total,
      query.page,
      query.limit,
    );
  }

  async list(query: QueryBusinessesDto): Promise<Paginated<BusinessResponse>> {
    const where: Prisma.BusinessWhereInput = {};

    if (query.type) where.type = query.type;

    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // 👇 NEW filters
    if (query.categoryId && query.categoryId.length > 0) {
      where.categories = {
        some: { categoryId: { in: query.categoryId } },
      };
    }

    if (query.verified === 'true') where.verified = true;
    if (query.verified === 'false') where.verified = false;

    if (query.ownerId) where.ownerId = query.ownerId;

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: BUSINESS_INCLUDE,
      }),
      this.prisma.business.count({ where }),
    ]);

    return paginate(
      rows.map(toBusinessResponse),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(
    id: string,
    actor: AuthenticatedUser | undefined,
  ): Promise<BusinessDetailResponse> {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: BUSINESS_INCLUDE,
    });
    if (!business) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'النشاط التجاري غير موجود',
      });
    }

    const isOwner = actor !== undefined && actor.id === business.ownerId;

    return {
      business: toBusinessResponse(business),
      isOwner,
    };
  }

  /**
   * Resolve a public profile from:
   * - factory business id / factory owner user id
   * - employee user id
   */
  async publicProfile(id: string): Promise<PublicProfileResponse> {
    const factory = await this.resolveWorkshop(id);
    if (factory) {
      return this.buildFactoryProfile(factory);
    }

    const employee = await this.resolveEmployee(id);
    if (employee) {
      return this.buildEmployeeProfile(employee);
    }

    throw new NotFoundException({
      error: 'not_found',
      message: 'الملف غير موجود',
    });
  }

  /**
   * Paginated similar workshops for a factory public profile.
   * Accepts business id or factory owner user id.
   */
  async listSimilarFactories(
    id: string,
    query: PaginationDto,
  ): Promise<Paginated<BusinessResponse>> {
    const factory = await this.resolveWorkshop(id);
    if (!factory) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'ملف المصنع غير موجود',
      });
    }

    const categoryIds = factory.categories.map((row) => row.category.id);
    return this.findSimilarFactoriesPage(
      factory.id,
      factory.location,
      categoryIds,
      query.page,
      query.limit,
    );
  }

  private async buildFactoryProfile(
    factory: Business & {
      categories: {
        category: { id: string; name: string; slug: string };
      }[];
    },
  ): Promise<PublicFactoryProfileResponse> {
    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        active: true,
        type: { not: PostType.reel },
        OR: [{ businessId: factory.id }, { authorId: factory.ownerId }],
      },
      orderBy: { createdAt: 'desc' },
      take: FACTORY_POSTS_LIMIT,
      include: FACTORY_POST_INCLUDE,
    });

    const mapped = toBusinessResponse(factory);

    return {
      kind: 'factory',
      id: factory.id,
      profile: {
        name: mapped.name,
        description: mapped.description,
        verified: mapped.verified,
        services: mapped.services,
        imageUrl: mapped.imageUrl,
        location: mapped.location,
        phone: mapped.phone,
        experience: mapped.experience,
        categories: mapped.categories,
      },
      posts: await this.toPublicPostResponses(posts),
    };
  }

  private async buildEmployeeProfile(
    employee: User & { location: Location | null },
  ): Promise<PublicEmployeeProfileResponse> {
    const [posts, similarRows] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          deletedAt: null,
          active: true,
          type: { not: PostType.reel },
          authorId: employee.id,
        },
        orderBy: { createdAt: 'desc' },
        take: EMPLOYEE_POSTS_LIMIT,
        include: FACTORY_POST_INCLUDE,
      }),
      this.findSimilarEmployees(
        employee.id,
        employee.locationId,
        toEmployeeLikeRole(employee.role),
      ),
    ]);

    const role = toEmployeeLikeRole(employee.role);

    return {
      kind: role,
      id: employee.id,
      profile: {
        id: employee.id,
        name: employee.name,
        bio: employee.bio,
        avatarUrl: withDefaultAvatar(employee.avatarUrl),
        verified: employee.verified,
        availableForWork: employee.availableForWork,
        location: employee.location?.name ?? null,
        phone: employee.phone,
        role,
      },
      posts: await this.toPublicPostResponses(posts),
      similar: similarRows.map((row) => ({
        id: row.id,
        name: row.name,
        bio: row.bio,
        avatarUrl: withDefaultAvatar(row.avatarUrl),
        verified: row.verified,
        availableForWork: row.availableForWork,
        location: row.location?.name ?? null,
      })),
    };
  }

  private async resolveWorkshop(id: string) {
    const byBusinessId = await this.prisma.business.findUnique({
      where: { id },
      include: BUSINESS_INCLUDE,
    });
    if (byBusinessId?.type === BusinessType.workshop) {
      return byBusinessId;
    }

    const byOwnerId = await this.prisma.business.findUnique({
      where: { ownerId: id },
      include: BUSINESS_INCLUDE,
    });
    if (byOwnerId?.type === BusinessType.workshop) {
      return byOwnerId;
    }

    return null;
  }

  private async resolveEmployee(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { location: true },
    });
    if (
      !user ||
      user.suspended ||
      !isEmployeeLikeRole(user.role) ||
      !user.onboardingCompleted
    ) {
      return null;
    }
    return user;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateBusinessDto,
  ): Promise<{ business: BusinessResponse }> {
    const existing = await this.prisma.business.findUnique({
      where: { ownerId: actor.id },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException({
        error: 'already_has_business',
        message: 'لديك نشاط مسبقاً',
      });
    }

    const categoryIds = [...new Set(dto.categoryIds ?? [])];
    if (categoryIds.length > 0) {
      await this.assertBusinessCategories(categoryIds);
    }

    const business = await this.prisma.business.create({
      data: {
        ownerId: actor.id,
        type: dto.type,
        name: dto.name,
        location: dto.location,
        description: dto.description ?? null,
        phone: dto.phone ?? null,
        capacity: dto.capacity ?? null,
        equipment: dto.equipment ?? null,
        minOrder: dto.minOrder ?? null,
        experience: dto.experience ?? null,
        services: dto.services ?? [],
        duration: dto.duration ?? null,
        topics: dto.topics ?? [],
        ...(categoryIds.length > 0
          ? {
            categories: {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }
          : {}),
      },
      include: BUSINESS_INCLUDE,
    });

    return { business: toBusinessResponse(business) };
  }

  async update(
    id: string,
    dto: UpdateBusinessDto,
  ): Promise<{ business: BusinessResponse }> {
    if (dto.categoryIds !== undefined) {
      await this.assertBusinessCategories(dto.categoryIds);
    }

    const business = await this.prisma.$transaction(
      async (tx): Promise<Business & { categories: any[] }> => {
        const data: Prisma.BusinessUpdateInput = {};
        if (dto.type !== undefined) data.type = dto.type;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.location !== undefined) data.location = dto.location;
        if (dto.description !== undefined) data.description = dto.description;
        if (dto.phone !== undefined) data.phone = dto.phone;
        if (dto.capacity !== undefined) data.capacity = dto.capacity;
        if (dto.equipment !== undefined) data.equipment = dto.equipment;
        if (dto.minOrder !== undefined) data.minOrder = dto.minOrder;
        if (dto.experience !== undefined) data.experience = dto.experience;
        if (dto.services !== undefined) data.services = dto.services;
        if (dto.duration !== undefined) data.duration = dto.duration;
        if (dto.topics !== undefined) data.topics = dto.topics;

        if (dto.categoryIds !== undefined) {
          await tx.businessCategory.deleteMany({ where: { businessId: id } });
          if (dto.categoryIds.length > 0) {
            await tx.businessCategory.createMany({
              data: [...new Set(dto.categoryIds)].map((categoryId) => ({
                businessId: id,
                categoryId,
              })),
            });
          }
        }

        return tx.business.update({
          where: { id },
          data,
          include: BUSINESS_INCLUDE,
        });
      },
    );

    return { business: toBusinessResponse(business) };
  }

  private async assertBusinessCategories(ids: string[]): Promise<void> {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return;

    const rows = await this.prisma.category.findMany({
      where: { id: { in: unique } },
      select: { id: true, appliesTo: true },
    });

    if (rows.length !== unique.length) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'فئة أو أكثر غير موجودة',
          fields: { categoryIds: 'يحتوي معرفاً غير معروف' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const invalid = rows.filter(
      (row) => !BUSINESS_CATEGORY_SCOPES.includes(row.appliesTo),
    );
    if (invalid.length > 0) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'فئة أو أكثر ليست فئات نشاط',
          fields: {
            categoryIds:
              'يجب أن تنطبق على نشاط أو ورشة أو معهد أو متجر',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async findSimilarFactoriesPage(
    factoryId: string,
    location: string,
    categoryIds: string[],
    page: number,
    limit: number,
  ): Promise<Paginated<BusinessResponse>> {
    const orderBy = [
      { verified: 'desc' as const },
      { createdAt: 'desc' as const },
    ];
    const baseWhere: Prisma.BusinessWhereInput = {
      type: BusinessType.workshop,
      id: { not: factoryId },
    };

    const preferredOr: Prisma.BusinessWhereInput[] = [
      ...(categoryIds.length > 0
        ? [{ categories: { some: { categoryId: { in: categoryIds } } } }]
        : []),
      { location: { equals: location, mode: 'insensitive' } },
    ];

    const preferredWhere: Prisma.BusinessWhereInput = {
      ...baseWhere,
      OR: preferredOr,
    };
    const fillerWhere: Prisma.BusinessWhereInput = {
      ...baseWhere,
      NOT: { OR: preferredOr },
    };

    const [preferredTotal, fillerTotal] = await Promise.all([
      this.prisma.business.count({ where: preferredWhere }),
      this.prisma.business.count({ where: fillerWhere }),
    ]);
    const total = preferredTotal + fillerTotal;
    const { skip, take } = skipTake(page, limit);

    if (total === 0 || skip >= total) {
      return paginate([], total, page, limit);
    }

    let rows: Array<
      Business & {
        categories: {
          category: { id: string; name: string; slug: string };
        }[];
      }
    > = [];

    if (skip + take <= preferredTotal) {
      rows = await this.prisma.business.findMany({
        where: preferredWhere,
        orderBy,
        skip,
        take,
        include: BUSINESS_INCLUDE,
      });
    } else if (skip >= preferredTotal) {
      rows = await this.prisma.business.findMany({
        where: fillerWhere,
        orderBy,
        skip: skip - preferredTotal,
        take,
        include: BUSINESS_INCLUDE,
      });
    } else {
      const preferredTake = preferredTotal - skip;
      const [preferred, fillers] = await Promise.all([
        this.prisma.business.findMany({
          where: preferredWhere,
          orderBy,
          skip,
          take: preferredTake,
          include: BUSINESS_INCLUDE,
        }),
        this.prisma.business.findMany({
          where: fillerWhere,
          orderBy,
          skip: 0,
          take: take - preferredTake,
          include: BUSINESS_INCLUDE,
        }),
      ]);
      rows = [...preferred, ...fillers];
    }

    return paginate(rows.map(toBusinessResponse), total, page, limit);
  }

  private async findSimilarEmployees(
    employeeId: string,
    locationId: string | null,
    role: EmployeeLikeRole = UserRole.employee,
  ): Promise<Array<User & { location: Location | null }>> {
    const baseWhere: Prisma.UserWhereInput = {
      role,
      suspended: false,
      onboardingCompleted: true,
      id: { not: employeeId },
    };

    const preferred = locationId
      ? await this.prisma.user.findMany({
          where: { ...baseWhere, locationId },
          orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
          take: SIMILAR_EMPLOYEES_LIMIT,
          include: { location: true },
        })
      : [];

    if (preferred.length >= SIMILAR_EMPLOYEES_LIMIT) {
      return preferred;
    }

    const missing = SIMILAR_EMPLOYEES_LIMIT - preferred.length;
    const excludeIds = [employeeId, ...preferred.map((row) => row.id)];
    const fillers = await this.prisma.user.findMany({
      where: {
        ...baseWhere,
        id: { notIn: excludeIds },
      },
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
      take: missing,
      include: { location: true },
    });

    return [...preferred, ...fillers];
  }

  private async toPublicPostResponses(
    posts: PostWithRelationsForMapper[],
  ): Promise<PostResponse[]> {
    if (posts.length === 0) return [];

    const postIds = posts.map((post) => post.id);
    const [likeCounts, commentCounts] = await Promise.all([
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
    ]);

    const likeMap = new Map(likeCounts.map((row) => [row.postId, row._count._all]));
    const commentMap = new Map(
      commentCounts.map((row) => [row.postId, row._count._all]),
    );

    return posts.map((post) => {
      const counts: PostCounts = {
        likes: likeMap.get(post.id) ?? 0,
        comments: commentMap.get(post.id) ?? 0,
        likedByMe: false,
        savedByMe: false,
      };
      return toPostResponse(post, counts);
    });
  }
}