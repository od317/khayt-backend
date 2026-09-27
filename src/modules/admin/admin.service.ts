import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { toUserResponse, UserResponse } from '../auth/auth.mapper';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createStaffUser(
    actor: AuthenticatedUser,
    dto: CreateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    this.assertSuperAdmin(actor);

    if (dto.role === UserRole.admin || dto.role === UserRole.inventory) {
      return this.createEmailUser(dto);
    }

    if (dto.role === UserRole.delivery) {
      return this.createPhoneUser(dto);
    }

    throw new HttpException(
      {
        error: 'validation_failed',
        message: 'Invalid role',
        fields: { role: 'must be admin, inventory, or delivery' },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async listUsers(
    actor: AuthenticatedUser,
    query: QueryUsersDto,
  ): Promise<Paginated<UserResponse>> {
    this.assertSuperAdmin(actor);

    const where: Prisma.UserWhereInput = {};

    if (query.role) where.role = query.role;
    if (query.verified !== undefined)
      where.verified = query.verified === 'true';
    if (query.suspended !== undefined) {
      where.suspended = query.suspended === 'true';
    }
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { location: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(rows.map(toUserResponse), total, query.page, query.limit);
  }

  async updateUser(
    actor: AuthenticatedUser,
    userId: string,
    dto: UpdateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    this.assertSuperAdmin(actor);

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'User not found',
      });
    }

    if (dto.role !== undefined && target.role === UserRole.super_admin) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Cannot change the role of a super admin',
      });
    }

    if (dto.suspended === true && target.role === UserRole.super_admin) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Cannot suspend a super admin',
      });
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.verified !== undefined) data.verified = dto.verified;
    if (dto.suspended !== undefined) data.suspended = dto.suspended;
    if (dto.role !== undefined) data.role = dto.role;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { location: true },
    });

    return { user: toUserResponse(updated) };
  }

  private assertSuperAdmin(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.super_admin) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only super admins can perform this action',
      });
    }
  }

  private async createEmailUser(
    dto: CreateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    if (!dto.email || !dto.password) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'email and password are required for this role',
          fields: {
            email: !dto.email ? 'required for this role' : '',
            password: !dto.password ? 'required for this role' : '',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException({
        error: 'duplicate',
        message: 'A user with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        role: dto.role,
        email: dto.email,
        passwordHash,
        onboardingCompleted: true,
        verified: true,
      },
      include: { location: true },
    });

    return { user: toUserResponse(user) };
  }

  private async createPhoneUser(
    dto: CreateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    if (!dto.phone) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'phone is required for this role',
          fields: { phone: 'required for this role' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException({
        error: 'duplicate',
        message: 'A user with this phone already exists',
      });
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        role: dto.role,
        phone: dto.phone,
        onboardingCompleted: true,
        verified: true,
      },
      include: { location: true },
    });

    return { user: toUserResponse(user) };
  }
}
