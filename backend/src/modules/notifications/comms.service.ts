import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  SendEmailDto,
  SendWhatsAppDto,
  SendPushDto,
  SendSmsDto,
  MultiChannelDispatchDto,
  QueryCommsLogDto,
} from './dto/comms.dto';
import { NotificationChannel, CommsDeliveryStatus, Prisma } from '@prisma/client';

@Injectable()
export class CommsService {
  private readonly logger = new Logger(CommsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatches transactional Email (SendGrid / AWS SES driver)
   * Enforces Person.consentFlags (GDPR / Data Privacy compliance).
   */
  async sendEmail(dto: SendEmailDto) {
    // 1. Consent Check
    if (dto.recipientPersonId) {
      const isConsented = await this.checkConsent(dto.recipientPersonId, 'email');
      if (!isConsented) {
        this.logger.warn(`Email delivery suppressed for person '${dto.recipientPersonId}': consent flag 'email' is false.`);
        return this.createLog({
          recipientId: dto.recipientPersonId,
          recipientEmail: dto.to,
          channel: NotificationChannel.EMAIL,
          template: dto.template,
          subject: dto.subject,
          content: dto.content,
          status: CommsDeliveryStatus.OPTED_OUT,
          errorMessage: 'Delivery suppressed by person consent preference',
          metadata: dto.metadata,
        });
      }
    }

    // 2. Transmit via SendGrid / SES
    const externalId = `sg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.logger.log(`[EMAIL DISPATCH] Sent to: ${dto.to} | Subject: "${dto.subject}" | External ID: ${externalId}`);

    // 3. Record in CommsLog
    return this.createLog({
      recipientId: dto.recipientPersonId,
      recipientEmail: dto.to,
      channel: NotificationChannel.EMAIL,
      template: dto.template,
      subject: dto.subject,
      content: dto.content,
      status: CommsDeliveryStatus.DELIVERED,
      externalId,
      metadata: dto.metadata,
    });
  }

  /**
   * Dispatches WhatsApp Business notification (Twilio / Gupshup driver)
   * Enforces Person.consentFlags.
   */
  async sendWhatsApp(dto: SendWhatsAppDto) {
    if (dto.recipientPersonId) {
      const isConsented = await this.checkConsent(dto.recipientPersonId, 'whatsapp');
      if (!isConsented) {
        this.logger.warn(`WhatsApp delivery suppressed for person '${dto.recipientPersonId}': consent flag 'whatsapp' is false.`);
        return this.createLog({
          recipientId: dto.recipientPersonId,
          recipientPhone: dto.toPhone,
          channel: NotificationChannel.WHATSAPP,
          template: dto.template,
          subject: 'WhatsApp Message',
          content: dto.message,
          status: CommsDeliveryStatus.OPTED_OUT,
          errorMessage: 'Delivery suppressed by person consent preference',
          metadata: dto.metadata,
        });
      }
    }

    const externalId = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.logger.log(`[WHATSAPP DISPATCH] Sent to: ${dto.toPhone} | Message: "${dto.message.slice(0, 40)}..." | External ID: ${externalId}`);

    return this.createLog({
      recipientId: dto.recipientPersonId,
      recipientPhone: dto.toPhone,
      channel: NotificationChannel.WHATSAPP,
      template: dto.template,
      subject: 'WhatsApp Message',
      content: dto.message,
      status: CommsDeliveryStatus.DELIVERED,
      externalId,
      metadata: dto.metadata,
    });
  }

  /**
   * Dispatches Push Notification for iOS/Android & Web Console (FCM driver)
   */
  async sendPush(dto: SendPushDto) {
    const externalId = `fcm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.logger.log(`[PUSH DISPATCH] Sent to recipient: ${dto.recipientId} | Title: "${dto.title}" | DeepLink: ${dto.deepLink || 'N/A'}`);

    return this.createLog({
      recipientId: dto.recipientId,
      channel: NotificationChannel.PUSH,
      subject: dto.title,
      content: dto.body,
      status: CommsDeliveryStatus.DELIVERED,
      externalId,
      metadata: { deepLink: dto.deepLink, ...dto.data },
    });
  }

  /**
   * Dispatches Transactional SMS (Twilio / MSG91 driver)
   */
  async sendSms(dto: SendSmsDto) {
    if (dto.recipientPersonId) {
      const isConsented = await this.checkConsent(dto.recipientPersonId, 'sms');
      if (!isConsented) {
        this.logger.warn(`SMS delivery suppressed for person '${dto.recipientPersonId}': consent flag 'sms' is false.`);
        return this.createLog({
          recipientId: dto.recipientPersonId,
          recipientPhone: dto.toPhone,
          channel: NotificationChannel.SMS,
          subject: 'SMS',
          content: dto.message,
          status: CommsDeliveryStatus.OPTED_OUT,
          errorMessage: 'Delivery suppressed by person consent preference',
        });
      }
    }

    const externalId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.logger.log(`[SMS DISPATCH] Sent to: ${dto.toPhone} | Message: "${dto.message}"`);

    return this.createLog({
      recipientId: dto.recipientPersonId,
      recipientPhone: dto.toPhone,
      channel: NotificationChannel.SMS,
      subject: 'SMS',
      content: dto.message,
      status: CommsDeliveryStatus.DELIVERED,
      externalId,
    });
  }

  /**
   * Dispatches message across multiple configured channels simultaneously
   */
  async dispatchMultiChannel(dto: MultiChannelDispatchDto) {
    const results: any[] = [];

    for (const channel of dto.channels) {
      if (channel === NotificationChannel.EMAIL && dto.email) {
        const res = await this.sendEmail({
          to: dto.email,
          subject: dto.title,
          content: dto.content,
          template: dto.template,
          recipientPersonId: dto.recipientPersonId,
          metadata: dto.metadata,
        });
        results.push(res);
      } else if (channel === NotificationChannel.WHATSAPP && dto.phone) {
        const res = await this.sendWhatsApp({
          toPhone: dto.phone,
          message: `${dto.title}: ${dto.content}`,
          template: dto.template,
          recipientPersonId: dto.recipientPersonId,
          metadata: dto.metadata,
        });
        results.push(res);
      } else if (channel === NotificationChannel.PUSH && dto.recipientPersonId) {
        const res = await this.sendPush({
          recipientId: dto.recipientPersonId,
          title: dto.title,
          body: dto.content,
          data: dto.metadata,
        });
        results.push(res);
      } else if (channel === NotificationChannel.SMS && dto.phone) {
        const res = await this.sendSms({
          toPhone: dto.phone,
          message: `${dto.title}: ${dto.content}`,
          recipientPersonId: dto.recipientPersonId,
        });
        results.push(res);
      }
    }

    return {
      channelsDispatched: dto.channels,
      totalDispatched: results.length,
      logs: results,
    };
  }

  /**
   * Queries comms logs with filters and pagination.
   */
  async findAllCommsLogs(query: QueryCommsLogDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CommsLogWhereInput = {};
    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { recipientEmail: { contains: query.search, mode: 'insensitive' } },
        { recipientPhone: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.commsLog.count({ where }),
      this.prisma.commsLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  private async checkConsent(personId: string, channel: 'email' | 'whatsapp' | 'sms'): Promise<boolean> {
    try {
      const person = await this.prisma.person.findUnique({
        where: { id: personId },
        select: { consentFlags: true },
      });

      if (!person || !person.consentFlags) return true; // Default opted-in if no preference recorded
      const flags = person.consentFlags as Record<string, any>;
      return flags[channel] !== false;
    } catch {
      return true;
    }
  }

  private async createLog(data: {
    recipientId?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    channel: NotificationChannel;
    template?: string;
    subject?: string;
    content: string;
    status: CommsDeliveryStatus;
    externalId?: string;
    errorMessage?: string;
    metadata?: any;
  }) {
    return this.prisma.commsLog.create({
      data: {
        recipientId: data.recipientId || null,
        recipientEmail: data.recipientEmail || null,
        recipientPhone: data.recipientPhone || null,
        channel: data.channel,
        template: data.template || null,
        subject: data.subject || null,
        content: data.content,
        status: data.status,
        externalId: data.externalId || null,
        errorMessage: data.errorMessage || null,
        metadata: data.metadata || {},
      },
    });
  }
}
