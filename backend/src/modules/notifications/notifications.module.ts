import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CommsService } from './comms.service';
import { CommsController } from './comms.controller';
import { CrmEventBusService } from '../../events/crm-event-bus.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, CommsController],
  providers: [NotificationsService, CommsService, CrmEventBusService],
  exports: [NotificationsService, CommsService, CrmEventBusService],
})
export class NotificationsModule {}
