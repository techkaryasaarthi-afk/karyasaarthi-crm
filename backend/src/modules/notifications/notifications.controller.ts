import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  QueryNotificationDto,
} from './dto/notification.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('In-App Notifications Engine')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Dispatch manual notification or alert' })
  @ApiResponse({ status: 201, description: 'Notification dispatched' })
  send(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get current user notifications with unread count' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  findAll(@Req() req: any, @Query() query: QueryNotificationDto) {
    const recipientId = req.user?.id;
    return this.notificationsService.findAll(recipientId, query);
  }

  @Get('unread-count')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get unread notification count badge' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@Req() req: any) {
    const recipientId = req.user?.id;
    return this.notificationsService.getUnreadCount(recipientId);
  }

  @Patch(':id/read')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked read' })
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const recipientId = req.user?.id;
    return this.notificationsService.markAsRead(id, recipientId);
  }

  @Patch('read-all')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({ summary: 'Mark all user notifications as read' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  markAllAsRead(@Req() req: any) {
    const recipientId = req.user?.id;
    return this.notificationsService.markAllAsRead(recipientId);
  }
}
