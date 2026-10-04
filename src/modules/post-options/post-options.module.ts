import { Module } from '@nestjs/common';
import { AdminPostOptionsController } from './admin-post-options.controller';
import { PostOptionsController } from './post-options.controller';
import { PostOptionsService } from './post-options.service';

@Module({
  controllers: [PostOptionsController, AdminPostOptionsController],
  providers: [PostOptionsService],
  exports: [PostOptionsService],
})
export class PostOptionsModule {}
