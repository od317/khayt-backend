import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { CreateShippingCompanyDto } from './dto/create-shipping-company.dto';
import { QueryShippingCompaniesDto } from './dto/query-shipping-companies.dto';
import { UpdateShippingCompanyDto } from './dto/update-shipping-company.dto';
import {
    ShippingCompanyResponse,
    toShippingCompanyResponse,
} from './shipping-companies.mapper';

@Injectable()
export class ShippingCompaniesService {
    constructor(private readonly prisma: PrismaService) { }

    async list(
        query: QueryShippingCompaniesDto,
    ): Promise<Paginated<ShippingCompanyResponse>> {
        const where: Prisma.ShippingCompanyWhereInput = {};

        if (query.location) {
            where.location = { contains: query.location, mode: 'insensitive' };
        }

        if (query.q) {
            where.OR = [
                { name: { contains: query.q, mode: 'insensitive' } },
                { location: { contains: query.q, mode: 'insensitive' } },
            ];
        }

        if (query.verified === 'true') where.verified = true;
        if (query.verified === 'false') where.verified = false;

        const { skip, take } = skipTake(query.page, query.limit);

        const [rows, total] = await this.prisma.$transaction([
            this.prisma.shippingCompany.findMany({
                where,
                orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
                skip,
                take,
            }),
            this.prisma.shippingCompany.count({ where }),
        ]);

        return paginate(
            rows.map(toShippingCompanyResponse),
            total,
            query.page,
            query.limit,
        );
    }

    async detail(id: string): Promise<{ company: ShippingCompanyResponse }> {
        const company = await this.prisma.shippingCompany.findUnique({
            where: { id },
        });

        if (!company) {
            throw new NotFoundException({
                error: 'not_found',
                message: 'شركة الشحن غير موجودة',
            });
        }

        return { company: toShippingCompanyResponse(company) };
    }

    async adminCreate(
        dto: CreateShippingCompanyDto,
    ): Promise<{ company: ShippingCompanyResponse }> {
        const company = await this.prisma.shippingCompany.create({
            data: {
                name: dto.name.trim(),
                location: dto.location.trim(),
                verified: dto.verified ?? false,
                coverage: dto.coverage.map((c) => c.trim()).filter(Boolean),
                deliveryTime: dto.deliveryTime.trim(),
                pricing: dto.pricing?.trim() ?? null,
                fleet: dto.fleet?.trim() ?? null,
                phone: dto.phone.trim(),
            },
        });

        return { company: toShippingCompanyResponse(company) };
    }

    async adminUpdate(
        id: string,
        dto: UpdateShippingCompanyDto,
    ): Promise<{ company: ShippingCompanyResponse }> {
        const existing = await this.prisma.shippingCompany.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundException({
                error: 'not_found',
                message: 'شركة الشحن غير موجودة',
            });
        }

        const data: Prisma.ShippingCompanyUpdateInput = {};
        if (dto.name !== undefined) data.name = dto.name.trim();
        if (dto.location !== undefined) data.location = dto.location.trim();
        if (dto.verified !== undefined) data.verified = dto.verified;
        if (dto.coverage !== undefined) {
            data.coverage = dto.coverage.map((c) => c.trim()).filter(Boolean);
        }
        if (dto.deliveryTime !== undefined) data.deliveryTime = dto.deliveryTime.trim();
        if (dto.pricing !== undefined) data.pricing = dto.pricing?.trim() ?? null;
        if (dto.fleet !== undefined) data.fleet = dto.fleet?.trim() ?? null;
        if (dto.phone !== undefined) data.phone = dto.phone.trim();

        const company = await this.prisma.shippingCompany.update({
            where: { id },
            data,
        });

        return { company: toShippingCompanyResponse(company) };
    }

    async adminRemove(id: string): Promise<{ success: true }> {
        const existing = await this.prisma.shippingCompany.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundException({
                error: 'not_found',
                message: 'شركة الشحن غير موجودة',
            });
        }

        await this.prisma.shippingCompany.delete({ where: { id } });
        return { success: true };
    }
}