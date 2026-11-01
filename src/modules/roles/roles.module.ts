import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { AdminRolesController } from './admin-roles.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [RedisModule],
  controllers: [RolesController, AdminRolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
