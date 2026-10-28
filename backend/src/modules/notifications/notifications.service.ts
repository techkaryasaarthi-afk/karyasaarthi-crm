import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateNotificationDto,
  QueryNotificationDto,
  NotificationType,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(dto: CreateNotificationDto) {
    this.logger.log(`Dispatching [${dto.type || NotificationType.SYSTEM_ALERT}] notification to: ${dto.recipientId}`);

    return this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        title: dto.title,
        message: dto.message,
        type: dto.type || NotificationType.SYSTEM_ALERT,
        link: dto.link,
        metadata: dto.metadata || {},
      },
    });
  }

  async findAll(recipientId: string, query: QueryNotificationDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { recipientId };
    if (String(query.unreadOnly) === 'true') {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { recipientId, read: false },
      }),
    ]);

    return {
      data: notifications,
      unreadCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(recipientId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientId, read: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(id: string, recipientId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(recipientId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { markedCount: result.count };
  }
}
