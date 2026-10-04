import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostOptionsModule } from '../post-options/post-options.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [NotificationsModule, PostOptionsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
