import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { diskStorage } from 'multer';
import {
  CurrentUser,
  RequireUser,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import {
  createPostSwaggerExamples,
  paginated,
  sampleComment,
  samplePost,
} from '../../common/swagger/samples';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CommentResponse, PostResponse } from './posts.mapper';
import { PostsService } from './posts.service';

const postFilesStorage = diskStorage({
  destination: './uploads/posts',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const PostFilesInterceptor = FileFieldsInterceptor(
  [
    { name: 'images', maxCount: 8 },
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },   // 👈 new
  ],
  {
    storage: postFilesStorage,
    limits: { fileSize: 20 * 1024 * 1024, files: 10 },   // 👈 was 9, now 10
  },
);

function flattenPostFiles(
  grouped:
    | {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];   // 👈 new
    }
    | undefined,
): Express.Multer.File[] {
  return [
    ...(grouped?.images ?? []),
    ...(grouped?.video ?? []),
    ...(grouped?.thumbnail ?? []),           // 👈 new
  ];
}

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) { }

  @Public()
  @Get()
  @ApiSecurity({})
  @ApiOperation({
    summary: 'List posts',
    description:
      'Public feed is `active` + `approvalStatus=approved` only. Filters: type, businessId, categoryId, location, q, media, active, savedBy=me, authorId, forMe=true. If `active=false`, only the current user sees their own inactive posts. Authors see pending/rejected via `/posts/me` and `/posts/me/reels`.',
  })
  @ApiOkResponse({
    description: 'Paginated list of posts',
    schema: { example: paginated(samplePost) },
  })
  list(
    @Query() query: QueryPostsDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<Paginated<PostResponse>> {
    return this.posts.list(query, user);
  }

  @Get('mine')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List my posts',
    description:
      'Authenticated. Current user’s posts only (reels excluded), active and inactive, newest first. Paginated via page & limit.',
  })
  @ApiOkResponse({
    description: 'Paginated list of the current user’s posts',
    schema: { example: paginated(samplePost) },
  })
  listMine(
    @RequireUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<Paginated<PostResponse>> {
    return this.posts.listMine(user, query, 'posts');
  }

  @Get('mine/reels')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List my reels',
    description:
      'Authenticated. Current user’s reels only, active and inactive, newest first. Paginated via page & limit.',
  })
  @ApiOkResponse({
    description: 'Paginated list of the current user’s reels',
    schema: { example: paginated(samplePost) },
  })
  listMyReels(
    @RequireUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<Paginated<PostResponse>> {
    return this.posts.listMine(user, query, 'reels');
  }

  @Get('liked')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List posts I liked',
    description:
      'Authenticated. Posts the current user liked, newest like first. Paginated via page & limit.',
  })
  @ApiOkResponse({
    description: 'Paginated liked posts',
    schema: { example: paginated(samplePost) },
  })
  listLiked(
    @RequireUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<Paginated<PostResponse>> {
    return this.posts.listLiked(user, query);
  }

  @Get('saved')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List posts I saved',
    description:
      'Authenticated. Posts the current user saved, newest save first. Paginated via page & limit.',
  })
  @ApiOkResponse({
    description: 'Paginated saved posts',
    schema: { example: paginated(samplePost) },
  })
  listSaved(
    @RequireUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<Paginated<PostResponse>> {
    return this.posts.listSaved(user, query);
  }

  @Public()
  @Get(':id')
  @ApiSecurity({})
  @ApiOperation({ summary: 'Post detail' })
  @ApiOkResponse({
    description: 'Single post with author, business, categories, product',
    schema: { example: { post: samplePost } },
  })
  detail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<{ post: PostResponse }> {
    return this.posts.detail(id, user);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create post',
    description:
      'multipart/form-data. Only `body` is required. Optional `productId` links the post to one of your products.',
  })
  @ApiBody({
    description:
      'multipart/form-data. Attach photos with `images` (repeat, max 8). Reels also accept `video`. Reels can pass a custom `thumbnail` (JPG/PNG); otherwise a frame is auto-extracted from the video. Optional `productId` links to a product you own.',
    type: CreatePostDto,
    examples: createPostSwaggerExamples,
  })
  @ApiOkResponse({
    description: 'The created post',
    schema: { example: { post: samplePost } },
  })
  @UseInterceptors(PostFilesInterceptor)
  create(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];   // 👈 new
    },
  ): Promise<{ post: PostResponse }> {
    return this.posts.create(user, dto, flattenPostFiles(files));
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update post',
    description:
      'multipart/form-data. Send `productId` (empty) to unlink the current product. Send nothing to leave the link unchanged. Send `thumbnail` to replace the reel cover.',
  })
  @ApiBody({
    description:
      'multipart/form-data. Replace photos with `images` (repeat, max 8) or the reel with `video`. Send `thumbnail` to set a new reel cover. Set `productId=` to unlink.',
    type: UpdatePostDto,
  })
  @ApiOkResponse({
    description: 'The updated post',
    schema: { example: { post: samplePost } },
  })
  @UseInterceptors(PostFilesInterceptor)
  update(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdatePostDto,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];   // 👈 new
    },
  ): Promise<{ post: PostResponse }> {
    return this.posts.update(id, user, dto, flattenPostFiles(files));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete post' })
  @ApiOkResponse({
    description: 'The soft-deleted post',
    schema: { example: { post: samplePost, deleted: true } },
  })
  remove(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ post: PostResponse; deleted: true }> {
    return this.posts.remove(id, user);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Like a post' })
  like(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ liked: true; likes: number }> {
    return this.posts.like(id, user);
  }

  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unlike a post' })
  unlike(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ liked: false; likes: number }> {
    return this.posts.unlike(id, user);
  }

  @Post(':id/save/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Toggle save on a post',
    description:
      'Single request for save/unsave. Returns the resulting state: `{ saved: true }` if now saved, `{ saved: false }` if unsaved. POST/DELETE `/posts/:id/save` remain available.',
  })
  @ApiOkResponse({
    description: 'Resulting save state',
    schema: { example: { saved: true } },
  })
  toggleSave(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ saved: boolean }> {
    return this.posts.toggleSave(id, user);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Save a post' })
  save(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ saved: true }> {
    return this.posts.save(id, user);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unsave a post' })
  unsave(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ saved: false }> {
    return this.posts.unsave(id, user);
  }

  @Public()
  @Get(':id/comments')
  @ApiSecurity({})
  @ApiOperation({
    summary: 'List comments on a post',
    description:
      'Paginated top-level comments with nested replies (replies may themselves have replies).',
  })
  @ApiOkResponse({
    description: 'Paginated top-level comments with nested replies',
    schema: { example: paginated(sampleComment) },
  })
  listComments(
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ): Promise<Paginated<CommentResponse>> {
    return this.posts.listComments(id, query.page, query.limit);
  }

  @Post(':id/comments')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a comment' })
  @ApiOkResponse({
    description: 'The created comment',
    schema: { example: { comment: sampleComment } },
  })
  createComment(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ): Promise<{ comment: CommentResponse }> {
    return this.posts.createComment(id, user, dto);
  }
}