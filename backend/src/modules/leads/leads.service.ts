import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma, LeadStage, LeadUrgency, Role, PersonType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
  CreateLeadTaskDto,
  QueryLeadDto,
} from './dto/lead.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Creates a lead with automatic round-robin assignment and Claude Haiku scoring.
   */
  async create(dto: CreateLeadDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person) {
      throw new NotFoundException(`Person with ID "${dto.personId}" does not exist`);
    }

    // 1. Automatic Round-Robin Assignment if not provided
    let assignedStaffId = dto.assignedStaffId;
    if (!assignedStaffId) {
      assignedStaffId = await this.getRoundRobinStaff();
    }

    // 2. Cost-Effective AI Lead Scoring if score is not manually passed
    let score = dto.score;
    let urgency = dto.urgency || LeadUrgency.MEDIUM;

    if (score === undefined) {
      try {
        const aiScore = await this.aiService.scoreAndRouteLead({
          message: `${dto.title}. Notes: ${dto.notes || ''}`,
          serviceType: dto.serviceType,
          budget: dto.estimatedValue ? `${dto.estimatedValue}` : undefined,
        });
        if (aiScore?.qualityScore !== undefined) {
          score = aiScore.qualityScore;
        }
        if (aiScore?.urgency) {
          urgency = aiScore.urgency as LeadUrgency;
        }
      } catch (e: any) {
        this.logger.warn(`AI scoring fallback during lead creation: ${e.message}`);
        score = 50;
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        personId: dto.personId,
        title: dto.title,
        stage: dto.stage || LeadStage.NEW,
        score: score ?? 50,
        urgency,
        estimatedValue: dto.estimatedValue || null,
        serviceType: dto.serviceType || null,
        sourceSurface: dto.sourceSurface,
        assignedStaffId: assignedStaffId || null,
        notes: dto.notes || null,
      },
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });

    // Record creation in audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'LEAD_CREATED',
        entity: 'Lead',
        entityId: lead.id,
        diff: { title: lead.title, stage: lead.stage, score: lead.score },
      },
    });

    return lead;
  }

  /**
   * Retrieves the full Kanban Pipeline Board grouped by stage.
   */
  async getKanbanBoard() {
    const stages: LeadStage[] = [
      LeadStage.NEW,
      LeadStage.CONTACTED,
      LeadStage.QUALIFIED,
      LeadStage.PROPOSAL_SENT,
      LeadStage.WON,
      LeadStage.LOST,
    ];

    const allLeads = await this.prisma.lead.findMany({
      orderBy: [{ urgency: 'asc' }, { score: 'desc' }, { createdAt: 'desc' }],
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
        tasks: {
          where: { completed: false },
          orderBy: { dueAt: 'asc' },
          take: 3,
        },
      },
    });

    const columns: Record<string, { stage: LeadStage; count: number; totalValue: number; leads: any[] }> = {};

    for (const stage of stages) {
      const stageLeads = allLeads.filter((l) => l.stage === stage);
      const totalValue = stageLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
      columns[stage] = {
        stage,
        count: stageLeads.length,
        totalValue,
        leads: stageLeads,
      };
    }

    return {
      totalLeads: allLeads.length,
      columns,
    };
  }

  /**
   * Updates lead stage with transition audit trail and automatic client promotion if WON.
   */
  async updateStage(id: string, dto: UpdateLeadStageDto, actorId?: string) {
    const lead = await this.findOne(id);
    const oldStage = lead.stage;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { stage: dto.stage },
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });

    // If moved to WON, elevate person to CLIENT
    if (dto.stage === LeadStage.WON) {
      await this.prisma.person.update({
        where: { id: lead.personId },
        data: { type: PersonType.CLIENT },
      });
      this.logger.log(`🎉 Lead "${lead.title}" won! Client converted: ${lead.person.fullName}`);
    }

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        action: 'LEAD_STAGE_CHANGED',
        entity: 'Lead',
        entityId: id,
        diff: { from: oldStage, to: dto.stage, note: dto.note || '' },
      },
    });

    return updated;
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            interactions: {
              orderBy: { occurredAt: 'desc' },
              take: 5,
            },
          },
        },
        assignedStaff: { select: { id: true, name: true, email: true, role: true } },
        tasks: {
          orderBy: { dueAt: 'asc' },
          include: { assignedStaff: { select: { id: true, name: true } } },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID "${id}" not found`);
    }

    return lead;
  }

  async findAll(query: QueryLeadDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {};

    if (query.stage) where.stage = query.stage;
    if (query.urgency) where.urgency = query.urgency;
    if (query.sourceSurface) where.sourceSurface = query.sourceSurface;
    if (query.assignedStaffId) where.assignedStaffId = query.assignedStaffId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { serviceType: { contains: query.search, mode: 'insensitive' } },
        { person: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { person: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ urgency: 'asc' }, { score: 'desc' }, { createdAt: 'desc' }],
        include: {
          person: { select: { id: true, fullName: true, email: true, phone: true } },
          assignedStaff: { select: { id: true, name: true, role: true } },
          _count: { select: { tasks: true } },
        },
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

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        title: dto.title,
        stage: dto.stage,
        score: dto.score,
        urgency: dto.urgency,
        estimatedValue: dto.estimatedValue,
        serviceType: dto.serviceType,
        assignedStaffId: dto.assignedStaffId,
        notes: dto.notes,
      },
      include: {
        person: { select: { id: true, fullName: true, email: true } },
        assignedStaff: { select: { id: true, name: true } },
      },
    });
  }

  async assignLead(id: string, staffId: string) {
    await this.findOne(id);
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new NotFoundException(`Staff member with ID "${staffId}" not found`);
    }

    return this.prisma.lead.update({
      where: { id },
      data: { assignedStaffId: staffId },
      include: {
        person: { select: { id: true, fullName: true, email: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async createTask(leadId: string, dto: CreateLeadTaskDto) {
    await this.findOne(leadId);

    return this.prisma.leadTask.create({
      data: {
        leadId,
        title: dto.title,
        dueAt: new Date(dto.dueAt),
        assignedStaffId: dto.assignedStaffId || null,
      },
      include: {
        assignedStaff: { select: { id: true, name: true } },
      },
    });
  }

  async completeTask(taskId: string) {
    const task = await this.prisma.leadTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }

    return this.prisma.leadTask.update({
      where: { id: taskId },
      data: { completed: true },
    });
  }

  /**
   * Round-Robin load balancer: Selects the sales/manager staff member with the lowest active leads.
   */
  private async getRoundRobinStaff(): Promise<string | null> {
    const salesTeam = await this.prisma.staff.findMany({
      where: {
        active: true,
        role: { in: [Role.SALES, Role.MANAGER] },
      },
      select: {
        id: true,
        _count: {
          select: {
            assignedLeads: {
              where: { stage: { notIn: [LeadStage.WON, LeadStage.LOST] } },
            },
          },
        },
      },
      orderBy: {
        assignedLeads: {
          _count: 'asc',
        },
      },
    });

    return salesTeam.length > 0 ? salesTeam[0].id : null;
  }
}
