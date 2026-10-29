import { Module } from '@nestjs/common';
import { AdminControlService } from './admin-control.service';
import { AdminControlController } from './admin-control.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminControlController],
  providers: [AdminControlService],
  exports: [AdminControlService],
})
export class AdminControlModule {}

