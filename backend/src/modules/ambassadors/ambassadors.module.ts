import { Module } from '@nestjs/common';
import { AmbassadorsService } from './ambassadors.service';
import { AmbassadorsController } from './ambassadors.controller';
import { InteractionsModule } from '../interactions/interactions.module';

@Module({
  imports: [InteractionsModule],
  controllers: [AmbassadorsController],
  providers: [AmbassadorsService],
  exports: [AmbassadorsService],
})
export class AmbassadorsModule {}
