import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  Prisma,
  Surface,
  Role,
  ConversationStatus as PrismaConversationStatus,
  SenderType as PrismaSenderType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  CreateConversationDto,
  SendMessageDto,
  QueryConversationDto,
  CreateCannedReplyDto,
  ConversationStatus,
  SenderType,
} from './dto/inbox.dto';
import { InboxGateway } from './inbox.gateway';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @Inject(forwardRef(() => InboxGateway))
    private readonly inboxGateway: InboxGateway,
  ) {}

  /**
   * Creates or locates an existing open conversation for a person on a specific channel.
   * Enforces 15-minute first-response SLA.
   */
  async createConversation(dto: CreateConversationDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person) {
      throw new NotFoundException(`Person with ID "${dto.personId}" does not exist`);
    }

    // Check if open conversation exists on this channel
    const existing = await this.prisma.conversation.findFirst({
      where: {
        personId: dto.personId,
        channel: dto.channel,
        status: { in: [ConversationStatus.OPEN, ConversationStatus.PENDING] as unknown as PrismaConversationStatus[] },
      },
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });

    if (existing) {
      if (dto.initialMessage) {
        await this.sendMessage({
          conversationId: existing.id,
          content: dto.initialMessage,
          senderType: SenderType.CUSTOMER,
          channel: dto.channel,
        });
      }
      return existing;
    }

    // Set 15-minute First-Response SLA deadline
    const slaDueAt = new Date(Date.now() + 15 * 60 * 1000);

    const conversation = await this.prisma.conversation.create({
      data: {
        personId: dto.personId,
        channel: dto.channel,
        status: ConversationStatus.OPEN as unknown as PrismaConversationStatus,
        assignedStaffId: dto.assignedStaffId || null,
        slaDueAt,
      },
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });

    if (dto.initialMessage) {
      await this.sendMessage({
        conversationId: conversation.id,
        content: dto.initialMessage,
        senderType: SenderType.CUSTOMER,
        channel: dto.channel,
      });
    }

    return conversation;
  }

  /**
   * Retrieves conversation list with channel badges, SLA compliance indicators, and preview snippets.
   */
  async getConversations(query: QueryConversationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {};

    if (query.status) where.status = query.status as unknown as PrismaConversationStatus;
    if (query.channel) where.channel = query.channel;
    if (query.assignedStaffId) where.assignedStaffId = query.assignedStaffId;

    if (query.search) {
      where.OR = [
        { person: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { person: { email: { contains: query.search, mode: 'insensitive' } } },
        { person: { phone: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const now = new Date();

    const [total, conversations] = await Promise.all([
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          person: { select: { id: true, fullName: true, email: true, phone: true } },
          assignedStaff: { select: { id: true, name: true, role: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              senderType: true,
              isInternalNote: true,
              channel: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: { readAt: null, senderType: SenderType.CUSTOMER as unknown as PrismaSenderType },
              },
            },
          },
        },
      }),
    ]);

    const data = conversations.map((c) => {
      const isSlaBreached =
        !c.firstRespondedAt && c.slaDueAt ? c.slaDueAt < now : false;
      const slaRemainingMinutes =
        !c.firstRespondedAt && c.slaDueAt
          ? Math.round((c.slaDueAt.getTime() - now.getTime()) / (60 * 1000))
          : null;

      return {
        id: c.id,
        channel: c.channel,
        status: c.status,
        person: c.person,
        assignedStaff: c.assignedStaff,
        lastMessage: c.messages[0] || null,
        unreadCount: c._count.messages,
        lastMessageAt: c.lastMessageAt,
        sla: {
          dueAt: c.slaDueAt,
          firstRespondedAt: c.firstRespondedAt,
          isBreached: isSlaBreached,
          remainingMinutes: slaRemainingMinutes,
        },
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  /**
   * Retrieves chronological messages for a conversation.
   * If staffView is false (client view), internal staff notes are omitted.
   */
  async getMessages(conversationId: string, staffView = true) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID "${conversationId}" not found`);
    }

    const where: Prisma.ChatMessageWhereInput = { conversationId };
    if (!staffView) {
      where.isInternalNote = false;
    }

    return this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        senderStaff: { select: { id: true, name: true, role: true } },
      },
    });
  }

  /**
   * Sends a message in the thread.
   * Supports customer incoming, staff responses, internal notes, and file attachments.
   */
  async sendMessage(dto: SendMessageDto, staffId?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID "${dto.conversationId}" not found`);
    }

    const isStaff = dto.senderType === SenderType.STAFF;
    const now = new Date();

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: dto.conversationId,
        content: dto.content,
        senderType: (dto.senderType || SenderType.STAFF) as unknown as PrismaSenderType,
        senderStaffId: isStaff ? staffId || conversation.assignedStaffId || null : null,
        isInternalNote: dto.isInternalNote ?? false,
        channel: dto.channel || conversation.channel,
        attachments: (dto.attachments as Prisma.InputJsonValue) || [],
      },
      include: {
        senderStaff: { select: { id: true, name: true, role: true } },
      },
    });

    // Update conversation metadata
    const updateData: Prisma.ConversationUpdateInput = {
      lastMessageAt: now,
    };

    // If staff responded for the first time with a public message, record SLA fulfillment
    if (isStaff && !dto.isInternalNote && !conversation.firstRespondedAt) {
      updateData.firstRespondedAt = now;
    }

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: updateData,
    });

    // Broadcast message via WebSockets Gateway in real-time
    this.inboxGateway.broadcastMessage(dto.conversationId, message);

    return message;
  }

  /**
   * Uses cost-saving Claude Haiku to draft a contextual response proposal for staff.
   */
  async suggestReplyWithAi(conversationId: string, tone?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        person: true,
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID "${conversationId}" not found`);
    }

    const recentCustomerMessage = conversation.messages.find(
      (m) => (m.senderType as any) === SenderType.CUSTOMER,
    );

    const customerText = recentCustomerMessage
      ? recentCustomerMessage.content
      : 'Hello, looking for details on your digital solutions.';

    const context = `Client: ${conversation.person.fullName}. Channel: ${conversation.channel}. Recent turns: ${conversation.messages.length}.`;

    return this.aiService.draftReply({
      customerMessage: customerText,
      context,
      tone,
    });
  }

  /**
   * Canned replies & macros management.
   */
  async getCannedReplies(category?: string) {
    const where: Prisma.CannedReplyWhereInput = {};
    if (category) where.category = category;
    return this.prisma.cannedReply.findMany({
      where,
      orderBy: { shortcut: 'asc' },
    });
  }

  async createCannedReply(dto: CreateCannedReplyDto) {
    const existing = await this.prisma.cannedReply.findUnique({
      where: { shortcut: dto.shortcut },
    });
    if (existing) {
      throw new BadRequestException(`Canned reply shortcut "${dto.shortcut}" already exists`);
    }

    return this.prisma.cannedReply.create({
      data: {
        shortcut: dto.shortcut,
        title: dto.title,
        content: dto.content,
        category: dto.category || 'General',
      },
    });
  }

  async deleteCannedReply(id: string) {
    return this.prisma.cannedReply.delete({ where: { id } });
  }

  async assignConversation(id: string, staffId: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new NotFoundException(`Staff member with ID "${staffId}" not found`);
    }

    return this.prisma.conversation.update({
      where: { id },
      data: { assignedStaffId: staffId },
      include: {
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async updateStatus(id: string, status: ConversationStatus) {
    return this.prisma.conversation.update({
      where: { id },
      data: { status: status as unknown as PrismaConversationStatus },
    });
  }

  async markAsRead(conversationId: string) {
    await this.prisma.chatMessage.updateMany({
      where: { conversationId, readAt: null },
      data: { readAt: new Date() },
    });

    this.inboxGateway.broadcastReadReceipt(conversationId);
    return { success: true };
  }
}
