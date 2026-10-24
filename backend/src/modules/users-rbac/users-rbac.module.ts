import { Module } from '@nestjs/common';
import { UsersRbacService } from './users-rbac.service';
import { UsersRbacController } from './users-rbac.controller';

@Module({
  controllers: [UsersRbacController],
  providers: [UsersRbacService],
  exports: [UsersRbacService],
})
export class UsersRbacModule {}
