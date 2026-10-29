import { Module, forwardRef } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AiModule } from '../ai/ai.module';
import { AdminControlModule } from '../admin-control/admin-control.module';

@Module({
  imports: [AiModule, forwardRef(() => AdminControlModule)],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
