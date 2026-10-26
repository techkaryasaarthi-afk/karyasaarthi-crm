import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InteractionType, PersonType, Surface } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PersonsService } from '../persons/persons.service';
import { InteractionsService } from '../interactions/interactions.service';
import { AiService } from '../ai/ai.service';
import { LeadsService } from '../leads/leads.service';
import { InboxService } from '../inbox/inbox.service';
import { PublicEnquiryDto, PublicChatDto, PublicApplicationDto } from './dto/public-api.dto';

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly personsService: PersonsService,
    private readonly interactionsService: InteractionsService,
    private readonly aiService: AiService,
    private readonly leadsService: LeadsService,
    private readonly inboxService: InboxService,
  ) {}

  /**
   * Ingests enquiries from karyasaarthi.com, karyasaarthi.in, and the Mobile App.
   * Runs identity resolution, logs interaction, creates Kanban lead, and calculates AI routing with Claude Haiku.
   */
  async handleEnquiry(dto: PublicEnquiryDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Please provide either an email address or a phone number');
    }

    // 1. Identity Resolution & Linking
    const person = await this.personsService.findOrCreateOrLinkPerson({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      surface: dto.surface,
      type: PersonType.LEAD,
      consentFlags: dto.consentFlags,
    });

    // 2. Cost-Optimized AI Lead Scoring & Routing (Claude Haiku)
    const aiAnalysis = await this.aiService.scoreAndRouteLead({
      message: dto.message,
      serviceType: dto.serviceType,
      budget: dto.budget,
    });

    // 3. Log Unified Interaction Touchpoint
    const interaction = await this.interactionsService.create({
      personId: person.id,
      channel: dto.surface,
      type: InteractionType.FORM,
      payload: {
        sourceDomain:
          dto.surface === Surface.SITE_COM
            ? 'karyasaarthi.com'
            : dto.surface === Surface.SITE_IN
            ? 'karyasaarthi.in'
            : 'mobile_app',
        serviceType: dto.serviceType || 'General Inquiry',
        message: dto.message,
        budget: dto.budget || 'Not specified',
        consentFlags: dto.consentFlags || {},
        aiAssessment: aiAnalysis,
      },
    });

    // 4. Automatically create Lead card on the shared Kanban Board
    const lead = await this.leadsService.create({
      personId: person.id,
      title: `${dto.serviceType || 'Project Inquiry'} - ${dto.fullName}`,
      score: aiAnalysis?.qualityScore,
      urgency: aiAnalysis?.urgency as any,
      serviceType: dto.serviceType,
      sourceSurface: dto.surface,
      notes: `Inquiry message: ${dto.message}\nBudget: ${dto.budget || 'Not specified'}\nRationale: ${aiAnalysis?.rationale || 'N/A'}`,
    });

    this.logger.log(
      `📥 Ingested enquiry from ${dto.fullName} via ${dto.surface} (Person: ${person.id}, Lead: ${lead.id}, Score: ${aiAnalysis?.qualityScore || 'N/A'})`,
    );

    return {
      success: true,
      message: 'Enquiry received successfully. Our team will get back to you shortly.',
      data: {
        personId: person.id,
        interactionId: interaction.id,
        leadId: lead.id,
        routing: {
          urgency: aiAnalysis?.urgency || 'MEDIUM',
          department: aiAnalysis?.recommendedDepartment || 'General Sales',
        },
      },
    };
  }

  /**
   * Ingests live chat starter messages from web widgets & mobile app.
   * Auto-connects to the Omnichannel Inbox conversation thread.
   */
  async handleChatMessage(dto: PublicChatDto) {
    const displayName = dto.fullName?.trim() || 'Visitor from ' + dto.channel;

    const person = await this.personsService.findOrCreateOrLinkPerson({
      fullName: displayName,
      email: dto.email,
      phone: dto.phone,
      surface: dto.channel,
      type: PersonType.LEAD,
    });

    const interaction = await this.interactionsService.create({
      personId: person.id,
      channel: dto.channel,
      type: InteractionType.CHAT,
      payload: {
        message: dto.message,
        channel: dto.channel,
      },
    });

    // Ingest into Omnichannel Inbox Conversation Thread
    const conversation = await this.inboxService.createConversation({
      personId: person.id,
      channel: dto.channel,
      initialMessage: dto.message,
    });

    return {
      success: true,
      personId: person.id,
      interactionId: interaction.id,
      conversationId: conversation.id,
    };
  }

  /**
   * Ingests job applications from career.karyasaarthi.com.
   * Stitches identity to existing person (e.g. if previous client/lead applied).
   */
  async handleApplication(dto: PublicApplicationDto) {
    // 1. Verify Job Posting exists
    const jobPosting = await this.prisma.jobPosting.findUnique({
      where: { id: dto.roleId },
    });

    if (!jobPosting) {
      throw new NotFoundException(`Job posting with ID "${dto.roleId}" not found`);
    }

    // 2. Identity Stitching across surfaces
    const person = await this.personsService.findOrCreateOrLinkPerson({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      surface: Surface.CAREER,
      type: PersonType.APPLICANT,
    });

    // 3. Record Application
    const application = await this.prisma.application.create({
      data: {
        personId: person.id,
        roleId: dto.roleId,
        resumeUrl: dto.resumeUrl,
      },
    });

    // 4. Log Interaction
    await this.interactionsService.create({
      personId: person.id,
      channel: Surface.CAREER,
      type: InteractionType.APPLICATION,
      payload: {
        jobTitle: jobPosting.title,
        resumeUrl: dto.resumeUrl,
        coverNote: dto.coverNote || '',
        applicationId: application.id,
      },
    });

    this.logger.log(`💼 Ingested job application for "${jobPosting.title}" from ${dto.fullName} (Application: ${application.id})`);

    return {
      success: true,
      message: 'Application submitted successfully.',
      data: {
        applicationId: application.id,
        personId: person.id,
        roleTitle: jobPosting.title,
      },
    };
  }

  /**
   * Retrieves open job listings for career portal.
   */
  async getPublicJobs() {
    return this.prisma.jobPosting.findMany({
      where: { open: true },
      select: {
        id: true,
        title: true,
      },
    });
  }
}
