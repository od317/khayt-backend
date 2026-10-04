import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostOption, PostOptionKind, PostType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePostOptionDto } from './dto/create-post-option.dto';
import {
  QueryAdminPostOptionsDto,
  QueryPostOptionsDto,
} from './dto/query-post-options.dto';
import { UpdatePostOptionDto } from './dto/update-post-option.dto';
import {
  POST_OPTION_FIELD_NAME,
  POST_OPTION_KINDS_BY_TYPE,
} from './post-option-kinds';

export type PostOptionItem = {
  id: string;
  label: string;
  parentId: string | null;
  sortOrder: number;
};

export type PostOptionAdminItem = PostOptionItem & {
  kind: PostOptionKind;
  postTypes: PostType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PostOptionsByTypeResponse = {
  type: PostType;
  fields: Record<string, PostOptionItem[]>;
};

function toItem(row: PostOption): PostOptionItem {
  return {
    id: row.id,
    label: row.label,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
  };
}

function toAdminItem(row: PostOption): PostOptionAdminItem {
  return {
    ...toItem(row),
    kind: row.kind,
    postTypes: row.postTypes,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PostOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForType(
    query: QueryPostOptionsDto,
  ): Promise<PostOptionsByTypeResponse> {
    const kinds = POST_OPTION_KINDS_BY_TYPE[query.type];
    const fields: Record<string, PostOptionItem[]> = {};

    for (const kind of kinds) {
      fields[POST_OPTION_FIELD_NAME[kind]] = [];
    }

    if (kinds.length === 0) {
      return { type: query.type, fields };
    }

    const rows = await this.prisma.postOption.findMany({
      where: {
        active: true,
        kind: { in: [...kinds] },
        postTypes: { has: query.type },
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    for (const row of rows) {
      const key = POST_OPTION_FIELD_NAME[row.kind];
      fields[key]?.push(toItem(row));
    }

    return { type: query.type, fields };
  }

  async listAdmin(
    query: QueryAdminPostOptionsDto,
  ): Promise<{ items: PostOptionAdminItem[] }> {
    const where: Prisma.PostOptionWhereInput = {};
    if (query.kind) where.kind = query.kind;
    if (query.type) where.postTypes = { has: query.type };

    const rows = await this.prisma.postOption.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });

    return { items: rows.map(toAdminItem) };
  }

  async create(
    dto: CreatePostOptionDto,
  ): Promise<{ option: PostOptionAdminItem }> {
    await this.assertParent(dto.kind, dto.parentId);

    const option = await this.prisma.postOption.create({
      data: {
        kind: dto.kind,
        postTypes: dto.postTypes,
        label: dto.label.trim(),
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });

    return { option: toAdminItem(option) };
  }

  async update(
    id: string,
    dto: UpdatePostOptionDto,
  ): Promise<{ option: PostOptionAdminItem }> {
    const existing = await this.prisma.postOption.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post option not found',
      });
    }

    const nextKind = dto.kind ?? existing.kind;
    if (dto.parentId !== undefined) {
      await this.assertParent(nextKind, dto.parentId);
    } else if (dto.kind && dto.kind !== existing.kind) {
      await this.assertParent(nextKind, existing.parentId);
    }

    const data: Prisma.PostOptionUpdateInput = {};
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.postTypes !== undefined) data.postTypes = dto.postTypes;
    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.parentId !== undefined) {
      data.parent =
        dto.parentId === null
          ? { disconnect: true }
          : { connect: { id: dto.parentId } };
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) data.active = dto.active;

    const option = await this.prisma.postOption.update({
      where: { id },
      data,
    });

    return { option: toAdminItem(option) };
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.postOption.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Post option not found',
      });
    }
    if (existing._count.children > 0) {
      throw new HttpException(
        {
          error: 'conflict',
          message: 'Detach or delete child skills first',
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.postOption.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Ensures selected labels exist in the active catalog for this post type.
   * Returns field errors; empty object means valid.
   */
  async validateSelections(
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
  ): Promise<Record<string, string>> {
    const kinds = POST_OPTION_KINDS_BY_TYPE[type];
    if (kinds.length === 0) return {};

    const rows = await this.prisma.postOption.findMany({
      where: {
        active: true,
        kind: { in: [...kinds] },
        postTypes: { has: type },
      },
      select: {
        id: true,
        kind: true,
        label: true,
        parentId: true,
      },
    });

    const byKind = new Map<PostOptionKind, typeof rows>();
    for (const row of rows) {
      const list = byKind.get(row.kind) ?? [];
      list.push(row);
      byKind.set(row.kind, list);
    }

    const fields: Record<string, string> = {};
    const labelsOf = (kind: PostOptionKind): Set<string> =>
      new Set((byKind.get(kind) ?? []).map((r) => r.label));

    if (kinds.includes(PostOptionKind.specialty) && values.specialty) {
      if (!labelsOf(PostOptionKind.specialty).has(values.specialty)) {
        fields.specialty = 'must be an active specialty option';
      }
    }

    if (kinds.includes(PostOptionKind.skill) && values.skills?.length) {
      const skillRows = byKind.get(PostOptionKind.skill) ?? [];
      const specialty = (byKind.get(PostOptionKind.specialty) ?? []).find(
        (r) => r.label === values.specialty,
      );
      for (const skill of values.skills) {
        const match = skillRows.find((r) => r.label === skill);
        if (!match) {
          fields.skills = 'must use active skill options';
          break;
        }
        if (specialty && match.parentId && match.parentId !== specialty.id) {
          fields.skills = 'skills must belong to the selected specialty';
          break;
        }
      }
    }

    const singles: Array<{
      kind: PostOptionKind;
      value?: string;
      field: string;
    }> = [
      {
        kind: PostOptionKind.salary_type,
        value: values.salaryType,
        field: 'salaryType',
      },
      {
        kind: PostOptionKind.service_place,
        value: values.servicePlace,
        field: 'servicePlace',
      },
      { kind: PostOptionKind.pricing, value: values.pricing, field: 'pricing' },
      {
        kind: PostOptionKind.sell_method,
        value: values.sellMethod,
        field: 'sellMethod',
      },
      {
        kind: PostOptionKind.price_method,
        value: values.priceMethod,
        field: 'priceMethod',
      },
      {
        kind: PostOptionKind.condition,
        value: values.condition,
        field: 'condition',
      },
    ];

    for (const item of singles) {
      if (!kinds.includes(item.kind) || !item.value) continue;
      if (!labelsOf(item.kind).has(item.value)) {
        fields[item.field] = `must be an active ${item.field} option`;
      }
    }

    if (kinds.includes(PostOptionKind.work_type) && values.workType?.length) {
      const allowed = labelsOf(PostOptionKind.work_type);
      if (values.workType.some((v) => !allowed.has(v))) {
        fields.workType = 'must use active workType options';
      }
    }

    return fields;
  }

  private async assertParent(
    kind: PostOptionKind,
    parentId: string | null | undefined,
  ): Promise<void> {
    if (kind === PostOptionKind.skill) {
      if (!parentId) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'Skills require a parent specialty',
            fields: { parentId: 'required for skill options' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (parentId) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Only skill options may have a parent',
          fields: { parentId: 'only allowed for skill' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!parentId) return;

    const parent = await this.prisma.postOption.findUnique({
      where: { id: parentId },
      select: { kind: true, active: true },
    });
    if (!parent || parent.kind !== PostOptionKind.specialty) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'parentId must reference a specialty option',
          fields: { parentId: 'must reference a specialty' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
