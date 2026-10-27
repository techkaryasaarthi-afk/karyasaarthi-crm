import { Module } from '@nestjs/common';
import { CareersService } from './careers.service';
import { CareersController } from './careers.controller';
import { InteractionsModule } from '../interactions/interactions.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [InteractionsModule, AiModule],
  controllers: [CareersController],
  providers: [CareersService],
  exports: [CareersService],
})
export class CareersModule {}
