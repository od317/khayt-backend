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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { sampleComment } from '../../common/swagger/samples';
import { CreateCommentDto } from '../posts/dto/create-comment.dto';
import { UpdateCommentDto } from '../posts/dto/update-comment.dto';
import { CommentResponse } from '../posts/posts.mapper';
import { PostsService } from '../posts/posts.service';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly posts: PostsService) {}

  @Public()
  @Get(':id/reply')
  @ApiOperation({
    summary: 'List replies under a comment',
    description:
      'Returns nested replies (replies may themselves have replies).',
  })
  @ApiOkResponse({
    description: 'Nested reply tree',
    schema: {
      example: {
        items: [{ ...sampleComment, replies: [sampleComment] }],
      },
    },
  })
  listReplies(
    @Param('id') id: string,
  ): Promise<{ items: CommentResponse[] }> {
    return this.posts.listReplies(id);
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reply to a comment',
    description:
      'Creates a reply under the given comment. Replies can also have replies.',
  })
  @ApiCreatedResponse({
    description: 'The created reply',
    schema: { example: { comment: sampleComment } },
  })
  createReply(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ): Promise<{ comment: CommentResponse }> {
    return this.posts.createReply(id, user, dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a comment or reply',
    description: 'Only the author can edit.',
  })
  @ApiOkResponse({
    description: 'The updated comment',
    schema: { example: { comment: sampleComment } },
  })
  update(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommentDto,
  ): Promise<{ comment: CommentResponse }> {
    return this.posts.updateComment(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a comment or reply',
    description:
      'Comment author or post owner can delete. Nested replies are deleted with the parent.',
  })
  async remove(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.posts.deleteComment(id, user);
  }
}
