import { Module } from '@nestjs/common';
import { PublicApiService } from './public-api.service';
import { PublicApiController } from './public-api.controller';
import { PersonsModule } from '../persons/persons.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { AiModule } from '../ai/ai.module';
import { LeadsModule } from '../leads/leads.module';
import { InboxModule } from '../inbox/inbox.module';

@Module({
  imports: [PersonsModule, InteractionsModule, AiModule, LeadsModule, InboxModule],
  controllers: [PublicApiController],
  providers: [PublicApiService],
  exports: [PublicApiService],
})
export class PublicApiModule {}
