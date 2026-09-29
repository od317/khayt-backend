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
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { toUserResponse, UserResponse } from '../auth/auth.mapper';
import { normalizePhone } from '../auth/phone';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAppUsers(query: QueryUsersDto): Promise<Paginated<UserResponse>> {
    const appRoles = await this.roleValues(true);
    return this.listByRoles(appRoles, query, true);
  }

  async listEmployees(query: QueryUsersDto): Promise<Paginated<UserResponse>> {
    const appRoles = await this.roleValues(true);
    return this.listByRoles(appRoles, query, false);
  }

  async createEmployee(dto: CreateStaffUserDto): Promise<{ user: UserResponse }> {
    const role = await this.requireEmployeeRole(dto.role);

    if (role.value === UserRole.delivery) {
      return this.createPhoneUser(dto, role.value);
    }

    return this.createEmailUser(dto, role.value);
  }

  async updateAppUser(
    userId: string,
    dto: UpdateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    const appRoles = await this.roleValues(true);
    const target = await this.requireUserInGroup(userId, appRoles, true);

    if (dto.role !== undefined && !appRoles.includes(dto.role)) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Role must appear in the app',
          fields: { role: 'must be a visibleInApp role' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.applyUserUpdate(target.id, dto);
  }

  async updateEmployee(
    userId: string,
    dto: UpdateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
    const appRoles = await this.roleValues(true);
    const target = await this.requireUserInGroup(userId, appRoles, false);

    if (target.role === UserRole.super_admin) {
      if (dto.role !== undefined) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Cannot change the role of a super admin',
        });
      }
      if (dto.suspended === true) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Cannot suspend a super admin',
        });
      }
    }

    if (dto.role !== undefined) {
      await this.requireEmployeeRole(dto.role);
    }

    return this.applyUserUpdate(target.id, dto);
  }

  private async listByRoles(
    appRoles: string[],
    query: QueryUsersDto,
    appUsers: boolean,
  ): Promise<Paginated<UserResponse>> {
    const where: Prisma.UserWhereInput = appUsers
      ? { role: { in: appRoles } }
      : { role: { notIn: appRoles } };

    if (query.role) {
      const allowed = appUsers
        ? appRoles.includes(query.role)
        : !appRoles.includes(query.role);
      if (!allowed) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: appUsers
              ? 'Role is not an app-visible user role'
              : 'Role is not an employee role',
            fields: { role: 'does not belong to this list' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      where.role = query.role;
    }

    if (query.verified !== undefined) {
      where.verified = query.verified === 'true';
    }
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

  private async applyUserUpdate(
    userId: string,
    dto: UpdateStaffUserDto,
  ): Promise<{ user: UserResponse }> {
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

  private async requireUserInGroup(
    userId: string,
    appRoles: string[],
    appUsers: boolean,
  ): Promise<{ id: string; role: string }> {
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

    const isAppUser = appRoles.includes(target.role);
    if (isAppUser !== appUsers) {
      throw new NotFoundException({
        error: 'not_found',
        message: appUsers ? 'User not found' : 'Employee not found',
      });
    }

    return target;
  }

  private async requireEmployeeRole(value: string): Promise<{ value: string }> {
    const role = await this.prisma.role.findUnique({ where: { value } });
    if (!role) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Role does not exist',
          fields: { role: 'must reference an existing role' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (role.selectable) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'App roles cannot be created as employees',
          fields: { role: 'must be hidden from the app (visibleInApp false)' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (role.value === UserRole.super_admin) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Super admin accounts cannot be created this way',
      });
    }

    return role;
  }

  private async roleValues(selectable: boolean): Promise<string[]> {
    const rows = await this.prisma.role.findMany({
      where: { selectable },
      select: { value: true },
    });
    return rows.map((row) => row.value);
  }

  private async createEmailUser(
    dto: CreateStaffUserDto,
    role: string,
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
        role,
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
    role: string,
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

    const phone = normalizePhone(dto.phone);
    const existing = await this.prisma.user.findUnique({
      where: { phone },
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
        role,
        phone,
        onboardingCompleted: true,
        verified: true,
      },
      include: { location: true },
    });

    return { user: toUserResponse(user) };
  }
}
