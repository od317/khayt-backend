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
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
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
import { createPostSwaggerExamples } from '../../common/swagger/samples';
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
  ],
  {
    storage: postFilesStorage,
    limits: { fileSize: 20 * 1024 * 1024, files: 9 },
  },
);

function flattenPostFiles(
  grouped:
    | {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
      }
    | undefined,
): Express.Multer.File[] {
  return [...(grouped?.images ?? []), ...(grouped?.video ?? [])];
}

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Public()
  @Get()
  list(
    @Query() query: QueryPostsDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<Paginated<PostResponse>> {
    return this.posts.list(query, user);
  }

  @Public()
  @Get(':id')
  detail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<{ post: PostResponse }> {
    return this.posts.detail(id, user);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'multipart/form-data. Attach photos with `images` (repeat, max 8). Reels also accept `video`.',
    type: CreatePostDto,
    examples: createPostSwaggerExamples,
  })
  @UseInterceptors(PostFilesInterceptor)
  create(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ): Promise<{ post: PostResponse }> {
    return this.posts.create(user, dto, flattenPostFiles(files));
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'multipart/form-data. Replace photos with `images` (repeat, max 8) or the reel with `video`.',
    type: UpdatePostDto,
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
    },
  ): Promise<{ post: PostResponse }> {
    return this.posts.update(id, user, dto, flattenPostFiles(files));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ post: PostResponse; deleted: true }> {
    return this.posts.remove(id, user);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  like(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ liked: true; likes: number }> {
    return this.posts.like(id, user);
  }

  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  unlike(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ liked: false; likes: number }> {
    return this.posts.unlike(id, user);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  save(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ saved: true }> {
    return this.posts.save(id, user);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  unsave(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ saved: false }> {
    return this.posts.unsave(id, user);
  }

  @Public()
  @Get(':id/comments')
  listComments(
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ): Promise<Paginated<CommentResponse>> {
    return this.posts.listComments(id, query.page, query.limit);
  }

  @Post(':id/comments')
  createComment(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ): Promise<{ comment: CommentResponse }> {
    return this.posts.createComment(id, user, dto);
  }
}
