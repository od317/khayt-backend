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
import { UpdateEmployeeDto } from './dto/update-employee.dto';
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
          message: 'يجب أن يظهر الدور في التطبيق',
          fields: { role: 'يجب أن يكون دوراً ظاهراً في التطبيق' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.applyUserUpdate(target.id, dto);
  }

  async updateEmployee(
    userId: string,
    dto: UpdateEmployeeDto,
  ): Promise<{ user: UserResponse }> {
    const appRoles = await this.roleValues(true);
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        phone: true,
        passwordHash: true,
      },
    });

    if (!target) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'المستخدم غير موجود',
      });
    }

    if (appRoles.includes(target.role)) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الموظف غير موجود',
      });
    }

    if (target.role === UserRole.super_admin) {
      if (dto.role !== undefined) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'لا يمكن تغيير دور المشرف الأعلى',
        });
      }
      if (dto.suspended === true) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'لا يمكن إيقاف المشرف الأعلى',
        });
      }
    }

    const nextRole =
      dto.role !== undefined
        ? (await this.requireEmployeeRole(dto.role)).value
        : target.role;

    const nextEmail = dto.email !== undefined ? dto.email : target.email;
    const nextPhone =
      dto.phone !== undefined
        ? dto.phone === null
          ? null
          : normalizePhone(dto.phone)
        : target.phone;

    if (nextRole === UserRole.delivery) {
      if (!nextPhone) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'رقم الهاتف مطلوب لهذا الدور',
            fields: { phone: 'مطلوب لهذا الدور' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      if (!nextEmail) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'البريد مطلوب لهذا الدور',
            fields: { email: 'مطلوب لهذا الدور' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!target.passwordHash && !dto.password) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'كلمة المرور مطلوبة لهذا الدور',
            fields: { password: 'مطلوب لهذا الدور' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (nextEmail && nextEmail !== target.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: nextEmail },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException({
          error: 'مكرر',
          message: 'مستخدم بهذا البريد موجود',
        });
      }
    }

    if (nextPhone && nextPhone !== target.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: nextPhone },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException({
          error: 'مكرر',
          message: 'مستخدم بهذا الهاتف موجود',
        });
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = nextRole;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) {
      data.phone = dto.phone === null ? null : nextPhone;
    }
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    if (dto.verified !== undefined) data.verified = dto.verified;
    if (dto.suspended !== undefined) data.suspended = dto.suspended;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.locationId !== undefined) {
      data.location = await this.locationConnect(dto.locationId);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { location: true },
    });

    return { user: toUserResponse(updated) };
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
            fields: { role: 'لا ينتمي لهذه القائمة' },
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
        message: 'المستخدم غير موجود',
      });
    }

    const isAppUser = appRoles.includes(target.role);
    if (isAppUser !== appUsers) {
      throw new NotFoundException({
        error: 'not_found',
        message: appUsers ? 'المستخدم غير موجود' : 'الموظف غير موجود',
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
          message: 'الدور غير موجود',
          fields: { role: 'يجب أن يشير إلى دور موجود' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (role.selectable) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'أدوار التطبيق لا تُنشأ كموظفين',
          fields: { role: 'يجب أن يكون مخفياً عن التطبيق' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (role.value === UserRole.super_admin) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'لا يُنشأ مشرف أعلى بهذه الطريقة',
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

  private async locationConnect(
    locationId: string | null,
  ): Promise<Prisma.LocationUpdateOneWithoutUsersNestedInput> {
    if (locationId === null) {
      return { disconnect: true };
    }

    const location = await this.prisma.location.findFirst({
      where: { id: locationId, active: true },
      select: { id: true },
    });
    if (!location) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'الموقع غير موجود أو غير نشط',
          fields: { locationId: 'يجب أن يشير إلى موقع نشط' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return { connect: { id: locationId } };
  }

  private async createEmailUser(
    dto: CreateStaffUserDto,
    role: string,
  ): Promise<{ user: UserResponse }> {
    if (!dto.email || !dto.password) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'البريد وكلمة المرور مطلوبان لهذا الدور',
          fields: {
            email: !dto.email ? 'مطلوب لهذا الدور' : '',
            password: !dto.password ? 'مطلوب لهذا الدور' : '',
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
        error: 'مكرر',
        message: 'مستخدم بهذا البريد موجود',
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
          message: 'رقم الهاتف مطلوب لهذا الدور',
          fields: { phone: 'مطلوب لهذا الدور' },
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
        error: 'مكرر',
        message: 'مستخدم بهذا الهاتف موجود',
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
