import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Business, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import {
  BusinessResponse,
  SupplyLineResponse,
  toBusinessResponse,
  toSupplyLineResponse,
} from './businesses.mapper';
import { CreateBusinessDto } from './dto/create-business.dto';
import { QueryBusinessesDto } from './dto/query-businesses.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import {
  ProductResponse,
  toProductResponse,
} from '../products/products.mapper';

export type BusinessDetailResponse = {
  business: BusinessResponse;
  products: ProductResponse[];
  supply?: SupplyLineResponse[];
  isOwner: boolean;
};

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryBusinessesDto): Promise<Paginated<BusinessResponse>> {
    const where: Prisma.BusinessWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const { skip, take } = skipTake(query.page, query.limit);

    // TODO: decide whether unverified or suspended businesses should
    // be hidden from public browse. Currently showing all.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
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
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Business not found',
      });
    }

    const products = await this.prisma.product.findMany({
      where: { businessId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const supplies = await this.prisma.supply.findMany({
      where: { businessId: id },
      include: {
        product: { select: { name: true, unit: true, deletedAt: true } },
      },
    });

    const visibleSupplies = supplies.filter(
      (s) => s.product.deletedAt === null,
    );

    const isOwner = actor !== undefined && actor.id === business.ownerId;

    const response: BusinessDetailResponse = {
      business: toBusinessResponse(business),
      products: products.map(toProductResponse),
      isOwner,
    };

    if (visibleSupplies.length > 0) {
      response.supply = visibleSupplies.map((s) =>
        toSupplyLineResponse(s, s.product.name, s.product.unit),
      );
    }

    return response;
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
        message: 'You already own a business',
      });
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
        duration: dto.duration ?? null,
        topics: dto.topics ?? [],
      },
    });

    return { business: toBusinessResponse(business) };
  }

  async update(
    id: string,
    dto: UpdateBusinessDto,
  ): Promise<{ business: BusinessResponse }> {
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
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.topics !== undefined) data.topics = dto.topics;

    const business = await this.prisma.business.update({
      where: { id },
      data,
    });

    return { business: toBusinessResponse(business) };
  }
}
