import { Module } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';
import { InboxGateway } from './inbox.gateway';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [InboxController],
  providers: [InboxService, InboxGateway],
  exports: [InboxService, InboxGateway],
})
export class InboxModule {}
