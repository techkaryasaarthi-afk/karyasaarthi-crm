import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CommsService } from './comms.service';
import {
  SendEmailDto,
  SendWhatsAppDto,
  SendPushDto,
  MultiChannelDispatchDto,
  QueryCommsLogDto,
} from './dto/comms.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Transactional Multi-Channel Communications')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('notifications/comms')
export class CommsController {
  constructor(private readonly commsService: CommsService) {}

  @Post('dispatch')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Dispatch Multi-Channel Notification',
    description: 'Broadcasts transactional notification across Email, WhatsApp, Push, and SMS while checking person consent',
  })
  @ApiResponse({ status: 201, description: 'Notification dispatched across channels' })
  dispatchMultiChannel(@Body() dto: MultiChannelDispatchDto) {
    return this.commsService.dispatchMultiChannel(dto);
  }

  @Post('email')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Send direct transactional email' })
  @ApiResponse({ status: 201, description: 'Email dispatched' })
  sendEmail(@Body() dto: SendEmailDto) {
    return this.commsService.sendEmail(dto);
  }

  @Post('whatsapp')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Send direct WhatsApp message' })
  @ApiResponse({ status: 201, description: 'WhatsApp message dispatched' })
  sendWhatsApp(@Body() dto: SendWhatsAppDto) {
    return this.commsService.sendWhatsApp(dto);
  }

  @Post('push')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Send in-app / mobile push notification' })
  @ApiResponse({ status: 201, description: 'Push notification dispatched' })
  sendPush(@Body() dto: SendPushDto) {
    return this.commsService.sendPush(dto);
  }

  @Get('logs')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Query transactional comms delivery logs' })
  @ApiResponse({ status: 200, description: 'List of comms logs' })
  getLogs(@Query() query: QueryCommsLogDto) {
    return this.commsService.findAllCommsLogs(query);
  }
}
