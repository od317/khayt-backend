import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { CommentsController } from './comments.controller';

@Module({
  imports: [PostsModule],
  controllers: [CommentsController],
})
export class CommentsModule {}
