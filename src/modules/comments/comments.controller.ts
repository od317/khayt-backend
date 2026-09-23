import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { PostsService } from '../posts/posts.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly posts: PostsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.posts.deleteComment(id, user);
  }
}
