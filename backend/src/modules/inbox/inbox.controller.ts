import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InboxService } from './inbox.service';
import {
  CreateConversationDto,
  SendMessageDto,
  QueryConversationDto,
  CreateCannedReplyDto,
  DraftToneDto,
  UpdateConversationStatusDto,
  AssignConversationStaffDto,
} from './dto/inbox.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Omnichannel Inbox')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({
    summary: 'List threaded conversations with SLA and channel badges',
    description: 'Returns conversations from website widgets, mobile app, and WhatsApp with 15-min SLA tracking.',
  })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  getConversations(@Query() query: QueryConversationDto) {
    return this.inboxService.getConversations(query);
  }

  @Post('conversations')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Create or locate open conversation' })
  @ApiResponse({ status: 201, description: 'Conversation ready' })
  createConversation(@Body() dto: CreateConversationDto) {
    return this.inboxService.createConversation(dto);
  }

  @Get('conversations/:id/messages')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({
    summary: 'Get conversation message history',
    description: 'Retrieves full chronological message thread including internal staff notes.',
  })
  @ApiResponse({ status: 200, description: 'Message history' })
  getMessages(@Param('id') id: string) {
    return this.inboxService.getMessages(id, true);
  }

  @Post('messages')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Send reply or add internal staff note',
    description: 'Posts message in thread. If isInternalNote=true, visible only to team. Emits WebSockets event.',
  })
  @ApiResponse({ status: 201, description: 'Message sent' })
  sendMessage(@Body() dto: SendMessageDto, @Req() req: any) {
    const staffId = req.user?.id;
    return this.inboxService.sendMessage(dto, staffId);
  }

  @Post('conversations/:id/ai-draft')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Draft suggested reply using Claude Haiku (Cost-Saver)',
    description: 'Uses low-cost Claude Haiku to draft a contextual response suggestion for agents.',
  })
  @ApiResponse({ status: 200, description: 'AI reply proposal' })
  suggestReply(@Param('id') id: string, @Body() body: DraftToneDto) {
    return this.inboxService.suggestReplyWithAi(id, body?.tone);
  }

  @Patch('conversations/:id/assign')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Assign conversation to staff member' })
  @ApiResponse({ status: 200, description: 'Conversation assigned' })
  assignConversation(
    @Param('id') id: string,
    @Body() dto: AssignConversationStaffDto,
  ) {
    return this.inboxService.assignConversation(id, dto.staffId);
  }

  @Patch('conversations/:id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Update conversation status (OPEN, PENDING, RESOLVED, SNOOZED)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.inboxService.updateStatus(id, dto.status);
  }

  @Post('conversations/:id/read')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Mark messages in conversation as read' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  markAsRead(@Param('id') id: string) {
    return this.inboxService.markAsRead(id);
  }

  @Get('canned-replies')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'List canned reply templates & shortcuts' })
  @ApiResponse({ status: 200, description: 'List of canned replies' })
  getCannedReplies(@Query('category') category?: string) {
    return this.inboxService.getCannedReplies(category);
  }

  @Post('canned-replies')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create new canned reply / macro shortcut' })
  @ApiResponse({ status: 201, description: 'Canned reply created' })
  createCannedReply(@Body() dto: CreateCannedReplyDto) {
    return this.inboxService.createCannedReply(dto);
  }

  @Delete('canned-replies/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete canned reply macro' })
  @ApiResponse({ status: 200, description: 'Canned reply deleted' })
  deleteCannedReply(@Param('id') id: string) {
    return this.inboxService.deleteCannedReply(id);
  }
}
