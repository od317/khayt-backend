import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import { PostResponse } from './posts.mapper';
import { PostsService } from './posts.service';
import { AdminQueryPostsDto } from './dto/admin-query-posts.dto';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(RolesGuard)
@ApiTags('admin-posts')
@ApiBearerAuth('access-token')
@Controller('admin/posts')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminPostsController {
    constructor(private readonly posts: PostsService) { }

    @Get()
    @ApiOperation({
        summary: 'List all posts (including inactive and soft-deleted)',
        description:
            'Admin-only. By default returns everything except soft-deleted. Pass `includeDeleted=true` to also see soft-deleted posts.',
    })
    @ApiOkResponse({ description: 'Paginated list of posts' })
    listAll(
        @Query() query: AdminQueryPostsDto,
    ): Promise<Paginated<PostResponse>> {
        return this.posts.adminList(query);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Soft-delete a post (admin)',
        description:
            'Admin-only. Sets `deletedAt` and notifies the author. Reversible by an admin via direct DB access.',
    })
    remove(
        @Param('id') id: string,
        @RequireUser() actor: AuthenticatedUser,
    ): Promise<{ post: PostResponse; deleted: true }> {
        return this.posts.adminRemove(id, actor);
    }

    @Patch(':id/deactivate')
    @ApiOperation({
        summary: 'Deactivate a post (admin)',
        description:
            'Admin-only. Sets `active: false`. The post stays in the DB but disappears from public listings. Author is notified.',
    })
    deactivate(
        @Param('id') id: string,
        @RequireUser() actor: AuthenticatedUser,
    ): Promise<{ post: PostResponse }> {
        return this.posts.adminSetActive(id, false, actor);
    }

    @Patch(':id/activate')
    @ApiOperation({
        summary: 'Reactivate a post (admin)',
        description: 'Admin-only. Sets `active: true`.',
    })
    activate(
        @Param('id') id: string,
        @RequireUser() actor: AuthenticatedUser,
    ): Promise<{ post: PostResponse }> {
        return this.posts.adminSetActive(id, true, actor);
    }
}