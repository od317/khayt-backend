import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { sampleComment } from '../../common/swagger/samples';
import { UpdateCommentDto } from '../posts/dto/update-comment.dto';
import { CommentResponse } from '../posts/posts.mapper';
import { PostsService } from '../posts/posts.service';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly posts: PostsService) {}

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Only the comment author can edit their comment.',
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
    summary: 'Delete a comment',
    description: 'Comment author or post owner can delete.',
  })
  async remove(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.posts.deleteComment(id, user);
  }
}
