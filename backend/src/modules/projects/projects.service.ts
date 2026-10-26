import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateProjectStageDto,
  UpdateProjectStatusDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  SubmitDeliverableDto,
  UpdateDeliverableStatusDto,
  CreateRevisionRequestDto,
  UpdateRevisionStatusDto,
  ConvertLeadToProjectDto,
  QueryProjectDto,
  ProjectStage,
} from './dto/project.dto';
import { PersonType, Surface, InteractionType } from '@prisma/client';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionsService: InteractionsService,
  ) {}

  async create(dto: CreateProjectDto) {
    const client = await this.prisma.person.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    if (dto.vendorId) {
      const vendor = await this.prisma.person.findUnique({
        where: { id: dto.vendorId },
      });
      if (!vendor) {
        throw new NotFoundException(`Vendor person with ID ${dto.vendorId} not found`);
      }
    }

    const project = await this.prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description,
        clientId: dto.clientId,
        vendorId: dto.vendorId,
        serviceType: dto.serviceType,
        stage: (dto.stage as any) || 'SCOPING',
        status: (dto.status as any) || 'ACTIVE',
        budget: dto.budget,
        currency: dto.currency || 'INR',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        sourceSurface: (dto.sourceSurface as any) || 'SITE_COM',
      },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        vendor: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    await this.interactionsService.create({
      personId: client.id,
      channel: (dto.sourceSurface as Surface) || Surface.SITE_COM,
      type: InteractionType.FORM,
      payload: {
        event: 'PROJECT_COMMISSIONED',
        summary: `Project commissioned: "${project.title}" (${project.serviceType})`,
        projectId: project.id,
        stage: project.stage,
        budget: project.budget,
      },
    });

    return project;
  }

  async findAll(query: QueryProjectDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.stage) where.stage = query.stage;
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.vendorId) where.vendorId = query.vendorId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { serviceType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          vendor: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          milestones: {
            select: { id: true, title: true, status: true, amount: true },
          },
          _count: {
            select: { deliverables: true, revisions: true },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    const enriched = projects.map((p) => {
      const totalMilestones = p.milestones.length;
      const completedMilestones = p.milestones.filter(
        (m) => m.status === ('COMPLETED' as any),
      ).length;
      const progressPercent =
        totalMilestones > 0
          ? Math.round((completedMilestones / totalMilestones) * 100)
          : 0;

      return {
        ...p,
        progressPercent,
      };
    });

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        vendor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            vendorProfile: true,
          },
        },
        milestones: {
          orderBy: { createdAt: 'asc' },
        },
        deliverables: {
          orderBy: { version: 'desc' },
        },
        revisions: {
          orderBy: { createdAt: 'desc' },
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const totalMilestones = project.milestones.length;
    const completedMilestones = project.milestones.filter(
      (m) => m.status === ('COMPLETED' as any),
    ).length;
    const progressPercent =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    return {
      ...project,
      progressPercent,
    };
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId;
    if (dto.serviceType !== undefined) updateData.serviceType = dto.serviceType;
    if (dto.budget !== undefined) updateData.budget = dto.budget;
    if (dto.deadline !== undefined) {
      updateData.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }

    return this.prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, fullName: true, email: true } },
        vendor: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async updateStage(id: string, dto: UpdateProjectStageDto, actorId?: string) {
    const project = await this.findOne(id);

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        stage: dto.stage as any,
        status:
          dto.stage === ProjectStage.DELIVERED
            ? ('DELIVERED' as any)
            : project.status,
      },
      include: {
        client: true,
      },
    });

    await this.interactionsService.create({
      personId: updated.clientId,
      channel: updated.sourceSurface,
      type: InteractionType.FORM,
      payload: {
        event: 'PROJECT_STAGE_CHANGED',
        summary: `Project "${updated.title}" stage updated to ${dto.stage}${
          dto.notes ? ` - ${dto.notes}` : ''
        }`,
        projectId: id,
        newStage: dto.stage,
        updatedByStaffId: actorId,
      },
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateProjectStatusDto) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }

  async convertLeadToProject(dto: ConvertLeadToProjectDto, actorId?: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
      include: { person: true },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
    }

    // Ensure lead status is WON
    if (lead.stage !== 'WON') {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { stage: 'WON' },
      });
    }

    // Elevate Person to CLIENT
    if (lead.person.type !== PersonType.CLIENT) {
      await this.prisma.person.update({
        where: { id: lead.person.id },
        data: { type: PersonType.CLIENT },
      });
    }

    // Create the Project
    const project = await this.prisma.project.create({
      data: {
        title: dto.title || lead.title,
        description: `Generated from converted WON Lead ${lead.id}`,
        clientId: lead.personId,
        vendorId: dto.vendorId || null,
        serviceType: dto.serviceType || lead.serviceType || 'CONSULTING',
        stage: 'SCOPING',
        status: 'ACTIVE',
        budget: dto.budget !== undefined ? dto.budget : lead.estimatedValue,
        currency: 'INR',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        sourceSurface: lead.person.firstTouchSource,
      },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    await this.interactionsService.create({
      personId: lead.personId,
      channel: lead.person.firstTouchSource,
      type: InteractionType.FORM,
      payload: {
        event: 'LEAD_CONVERTED_TO_PROJECT',
        summary: `Lead converted to active Project: "${project.title}"`,
        leadId: lead.id,
        projectId: project.id,
        value: project.budget,
        actorId,
      },
    });

    return project;
  }

  async addMilestone(projectId: string, dto: CreateMilestoneDto) {
    await this.findOne(projectId);

    return this.prisma.projectMilestone.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        status: (dto.status as any) || 'PENDING',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        amount: dto.amount,
      },
    });
  }

  async updateMilestone(milestoneId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${milestoneId} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    if (dto.amount !== undefined) data.amount = dto.amount;

    return this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data,
    });
  }

  async completeMilestone(milestoneId: string) {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${milestoneId} not found`);
    }

    const updated = await this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'COMPLETED' as any,
        completedAt: new Date(),
      },
    });

    await this.interactionsService.create({
      personId: milestone.project.clientId,
      channel: milestone.project.sourceSurface,
      type: InteractionType.FORM,
      payload: {
        event: 'MILESTONE_COMPLETED',
        summary: `Milestone completed: "${milestone.title}" in project "${milestone.project.title}"`,
        projectId: milestone.projectId,
        milestoneId,
        amount: milestone.amount,
      },
    });

    return updated;
  }

  async submitDeliverable(projectId: string, dto: SubmitDeliverableDto) {
    await this.findOne(projectId);

    return this.prisma.projectDeliverable.create({
      data: {
        projectId,
        title: dto.title,
        fileUrl: dto.fileUrl,
        version: dto.version || 1,
        status: (dto.status as any) || 'SUBMITTED',
      },
    });
  }

  async updateDeliverableStatus(
    deliverableId: string,
    dto: UpdateDeliverableStatusDto,
  ) {
    const deliverable = await this.prisma.projectDeliverable.findUnique({
      where: { id: deliverableId },
    });
    if (!deliverable) {
      throw new NotFoundException(
        `Deliverable with ID ${deliverableId} not found`,
      );
    }

    return this.prisma.projectDeliverable.update({
      where: { id: deliverableId },
      data: { status: dto.status as any },
    });
  }

  async requestRevision(projectId: string, dto: CreateRevisionRequestDto) {
    await this.findOne(projectId);

    return this.prisma.revisionRequest.create({
      data: {
        projectId,
        deliverableId: dto.deliverableId || null,
        requestedBy: dto.requestedBy,
        feedback: dto.feedback,
        status: 'OPEN',
      },
    });
  }

  async updateRevisionStatus(
    revisionId: string,
    dto: UpdateRevisionStatusDto,
  ) {
    const revision = await this.prisma.revisionRequest.findUnique({
      where: { id: revisionId },
    });
    if (!revision) {
      throw new NotFoundException(`Revision with ID ${revisionId} not found`);
    }

    return this.prisma.revisionRequest.update({
      where: { id: revisionId },
      data: { status: dto.status as any },
    });
  }

  async getClientProjectOverview(clientId: string) {
    const client = await this.prisma.person.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const projects = await this.prisma.project.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        milestones: {
          orderBy: { createdAt: 'asc' },
        },
        deliverables: {
          orderBy: { version: 'desc' },
        },
        revisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return {
      client: {
        id: client.id,
        fullName: client.fullName,
        email: client.email,
      },
      totalProjects: projects.length,
      activeProjectsCount: projects.filter(
        (p) => p.status === ('ACTIVE' as any),
      ).length,
      projects: projects.map((p) => {
        const totalMilestones = p.milestones.length;
        const completedMilestones = p.milestones.filter(
          (m) => m.status === ('COMPLETED' as any),
        ).length;
        const progressPercent =
          totalMilestones > 0
            ? Math.round((completedMilestones / totalMilestones) * 100)
            : 0;

        return {
          id: p.id,
          title: p.title,
          serviceType: p.serviceType,
          stage: p.stage,
          status: p.status,
          deadline: p.deadline,
          budget: p.budget,
          currency: p.currency,
          progressPercent,
          milestones: p.milestones,
          latestDeliverables: p.deliverables.slice(0, 5),
          activeRevisions: p.revisions.filter(
            (r) => r.status === ('OPEN' as any) || r.status === ('IN_PROGRESS' as any),
          ),
        };
      }),
    };
  }
}
