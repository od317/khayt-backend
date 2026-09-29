import { Module } from '@nestjs/common';
import { AdminRolesController } from './admin-roles.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  controllers: [RolesController, AdminRolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
