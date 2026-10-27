import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import { AiService } from '../ai/ai.service';
import {
  CreateJobPostingDto,
  UpdateJobPostingDto,
  SubmitApplicationDto,
  UpdateApplicationStageDto,
  ScheduleInterviewDto,
  GenerateOfferDto,
  QueryJobPostingDto,
  QueryApplicationDto,
  AppStage,
} from './dto/career.dto';
import { PersonType, Surface, InteractionType } from '@prisma/client';

@Injectable()
export class CareersService {
  private readonly logger = new Logger(CareersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionsService: InteractionsService,
    private readonly aiService: AiService,
  ) {}

  // -------------------------------------------------------------
  // Job Postings Management
  // -------------------------------------------------------------

  async createJob(dto: CreateJobPostingDto) {
    return this.prisma.jobPosting.create({
      data: {
        title: dto.title,
        department: dto.department || 'Engineering',
        location: dto.location || 'Remote',
        type: dto.type || 'FULL_TIME',
        experience: dto.experience,
        salaryRange: dto.salaryRange,
        description: dto.description,
        requirements: dto.requirements || [],
        open: dto.open !== undefined ? dto.open : true,
      },
    });
  }

  async findAllJobs(query: QueryJobPostingDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.department) where.department = query.department;
    if (query.open !== undefined) where.open = String(query.open) === 'true';

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { department: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { applications: true },
          },
        },
      }),
      this.prisma.jobPosting.count({ where }),
    ]);

    return {
      data: jobs.map((job) => ({
        ...job,
        applicationsCount: job._count.applications,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneJob(id: string) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id },
      include: {
        applications: {
          orderBy: { appliedAt: 'desc' },
          select: {
            id: true,
            stage: true,
            aiMatchScore: true,
            appliedAt: true,
            person: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job posting with ID "${id}" not found`);
    }

    return {
      ...job,
      totalApplications: job._count.applications,
    };
  }

  async updateJob(id: string, dto: UpdateJobPostingDto) {
    await this.findOneJob(id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.experience !== undefined) updateData.experience = dto.experience;
    if (dto.salaryRange !== undefined) updateData.salaryRange = dto.salaryRange;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.requirements !== undefined) updateData.requirements = dto.requirements;
    if (dto.open !== undefined) updateData.open = dto.open;

    return this.prisma.jobPosting.update({
      where: { id },
      data: updateData,
    });
  }

  // -------------------------------------------------------------
  // Candidate Applications & ATS Pipeline
  // -------------------------------------------------------------

  async submitApplication(dto: SubmitApplicationDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person) {
      throw new NotFoundException(`Applicant Person with ID "${dto.personId}" not found`);
    }

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: dto.roleId },
    });
    if (!job) {
      throw new NotFoundException(`Job Posting with ID "${dto.roleId}" not found`);
    }
    if (!job.open) {
      throw new BadRequestException(`Job position "${job.title}" is currently closed`);
    }

    // Elevate Person to APPLICANT if currently LEAD
    if (person.type === PersonType.LEAD) {
      await this.prisma.person.update({
        where: { id: person.id },
        data: { type: PersonType.APPLICANT },
      });
    }

    // High-Intelligence Claude Sonnet Evaluation
    let aiMatchScore: number | null = null;
    let aiEvaluation: any = null;

    try {
      const candidateProfile = [
        `Candidate: ${person.fullName}`,
        `Years of Experience: ${dto.yearsOfExperience || 'Not specified'}`,
        `Skills: ${(dto.skills || []).join(', ') || 'Not specified'}`,
        `Portfolio / GitHub: ${dto.portfolioUrl || 'None'}`,
        `Resume Text Summary:\n${dto.resumeText || 'No text provided. Evaluate based on candidate skills.'}`,
      ].join('\n');

      const jobReqs = [
        `Job Title: ${job.title}`,
        `Department: ${job.department}`,
        `Experience Needed: ${job.experience || 'Not specified'}`,
        `Core Requirements:\n${(job.requirements || []).join('\n')}`,
        `Description:\n${job.description || ''}`,
      ].join('\n');

      this.logger.log(`Calling Claude Sonnet for candidate resume-to-role matching on job: "${job.title}"`);
      const evaluation = await this.aiService.matchResumeToJob({
        jobTitle: job.title,
        jobRequirements: jobReqs,
        resumeText: candidateProfile,
      });

      if (evaluation && typeof evaluation.matchScore === 'number') {
        aiMatchScore = evaluation.matchScore;
        aiEvaluation = evaluation;
      }
    } catch (aiErr: any) {
      this.logger.warn(`AI candidate evaluation skipped or failed: ${aiErr.message}`);
    }

    // Create Application record
    const application = await this.prisma.application.create({
      data: {
        personId: dto.personId,
        roleId: dto.roleId,
        stage: AppStage.APPLIED,
        resumeUrl: dto.resumeUrl,
        portfolioUrl: dto.portfolioUrl,
        yearsOfExperience: dto.yearsOfExperience,
        skills: dto.skills || [],
        aiMatchScore,
        aiEvaluation: aiEvaluation || undefined,
        referralCode: dto.referralCode,
      },
      include: {
        role: { select: { id: true, title: true, department: true } },
        person: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    // If referral code provided, record in ambassador referral table if valid
    if (dto.referralCode) {
      const ambassador = await this.prisma.campusAmbassador.findUnique({
        where: { referralCode: dto.referralCode.trim().toUpperCase() },
      });
      if (ambassador) {
        await this.prisma.ambassadorReferral.create({
          data: {
            ambassadorId: ambassador.id,
            referredPersonId: person.id,
            type: 'APPLICATION',
            status: 'ATTRIBUTED',
            rewardAmount: 250, // Standard referral reward points/currency
          },
        });
        await this.prisma.campusAmbassador.update({
          where: { id: ambassador.id },
          data: { totalReferrals: { increment: 1 } },
        });
      }
    }

    // Log Unified Interaction Touchpoint
    await this.interactionsService.create({
      personId: person.id,
      channel: Surface.CAREER,
      type: InteractionType.APPLICATION,
      payload: {
        event: 'JOB_APPLICATION_SUBMITTED',
        summary: `Application submitted for "${job.title}" (${job.department})`,
        applicationId: application.id,
        roleId: job.id,
        aiMatchScore,
      },
    });

    return application;
  }

  async findAllApplications(query: QueryApplicationDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.roleId) where.roleId = query.roleId;
    if (query.stage) where.stage = query.stage;
    if (query.minMatchScore !== undefined) {
      where.aiMatchScore = { gte: Number(query.minMatchScore) };
    }

    if (query.search) {
      where.person = {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ aiMatchScore: 'desc' }, { appliedAt: 'desc' }],
        include: {
          person: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          role: {
            select: { id: true, title: true, department: true },
          },
          reviewer: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data: applications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneApplication(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            type: true,
            firstTouchSource: true,
          },
        },
        role: true,
        reviewer: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }

    return application;
  }

  async updateStage(
    id: string,
    dto: UpdateApplicationStageDto,
    reviewerId?: string,
  ) {
    const application = await this.findOneApplication(id);

    const updateData: any = {
      stage: dto.stage,
    };
    if (reviewerId) updateData.reviewerId = reviewerId;
    if (dto.reviewerNotes) updateData.interviewNotes = dto.reviewerNotes;

    const updated = await this.prisma.application.update({
      where: { id },
      data: updateData,
      include: {
        person: true,
        role: true,
      },
    });

    await this.interactionsService.create({
      personId: updated.personId,
      channel: Surface.CAREER,
      type: InteractionType.FORM,
      payload: {
        event: 'APPLICATION_STAGE_CHANGED',
        summary: `Application for "${updated.role.title}" moved to ${dto.stage}`,
        applicationId: id,
        newStage: dto.stage,
        reviewerId,
      },
    });

    return updated;
  }

  async scheduleInterview(
    id: string,
    dto: ScheduleInterviewDto,
    reviewerId?: string,
  ) {
    await this.findOneApplication(id);

    return this.prisma.application.update({
      where: { id },
      data: {
        stage: AppStage.INTERVIEW,
        interviewScheduledAt: new Date(dto.scheduledAt),
        interviewNotes: dto.notes,
        reviewerId: reviewerId || undefined,
      },
      include: {
        person: true,
        role: true,
      },
    });
  }

  async generateOffer(
    id: string,
    dto: GenerateOfferDto,
    reviewerId?: string,
  ) {
    const app = await this.findOneApplication(id);

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        stage: AppStage.OFFER,
        offerAmount: dto.offerAmount,
        interviewNotes: dto.notes,
        reviewerId: reviewerId || undefined,
      },
      include: {
        person: true,
        role: true,
      },
    });

    // If candidate was referred by Campus Ambassador, mark referral CONVERTED and reward commission
    if (app.referralCode) {
      const ambassador = await this.prisma.campusAmbassador.findUnique({
        where: { referralCode: app.referralCode.trim().toUpperCase() },
      });
      if (ambassador) {
        await this.prisma.campusAmbassador.update({
          where: { id: ambassador.id },
          data: {
            successfulConversions: { increment: 1 },
            commissionEarned: { increment: 1000 }, // Successful hire bonus
          },
        });
      }
    }

    return updated;
  }

  async evaluateWithAi(id: string, resumeTextOverride?: string) {
    const application = await this.findOneApplication(id);

    const candidateProfile = [
      `Candidate: ${application.person.fullName}`,
      `Years of Experience: ${application.yearsOfExperience || 'Not specified'}`,
      `Skills: ${(application.skills || []).join(', ') || 'Not specified'}`,
      `Portfolio / GitHub: ${application.portfolioUrl || 'None'}`,
      `Resume Text:\n${resumeTextOverride || 'Evaluate based on available profile and skills.'}`,
    ].join('\n');

    const jobReqs = [
      `Job Title: ${application.role.title}`,
      `Department: ${application.role.department}`,
      `Requirements:\n${(application.role.requirements || []).join('\n')}`,
      `Description:\n${application.role.description || ''}`,
    ].join('\n');

    this.logger.log(`On-demand Claude Sonnet evaluation for application ${id}`);
    const evaluation = await this.aiService.matchResumeToJob({
      jobTitle: application.role.title,
      jobRequirements: jobReqs,
      resumeText: candidateProfile,
    });

    return this.prisma.application.update({
      where: { id },
      data: {
        aiMatchScore: evaluation.matchScore,
        aiEvaluation: evaluation,
      },
    });
  }
}
