import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import {
  CreateVendorProfileDto,
  UpdateVendorProfileDto,
  AssignVendorToProjectDto,
  CreateVendorPayoutDto,
  UpdatePayoutStatusDto,
  QueryVendorDto,
  PayoutStatus,
} from './dto/vendor.dto';
import { PersonType, Surface, InteractionType } from '@prisma/client';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionsService: InteractionsService,
  ) {}

  async createProfile(dto: CreateVendorProfileDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
      include: { vendorProfile: true },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${dto.personId} not found`);
    }

    if (person.vendorProfile) {
      throw new BadRequestException(
        `Person ${person.fullName} already has an active Vendor Profile`,
      );
    }

    // Elevate Person type to VENDOR if not already
    if (person.type !== PersonType.VENDOR) {
      await this.prisma.person.update({
        where: { id: person.id },
        data: { type: PersonType.VENDOR },
      });
    }

    const profile = await this.prisma.vendorProfile.create({
      data: {
        personId: dto.personId,
        skills: dto.skills || [],
        maxCapacity: dto.maxCapacity || 3,
        contractUrl: dto.contractUrl,
        ndaSigned: dto.ndaSigned || false,
        ndaSignedAt: dto.ndaSigned ? new Date() : null,
      },
      include: {
        person: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    await this.interactionsService.create({
      personId: person.id,
      channel: person.firstTouchSource || Surface.SITE_COM,
      type: InteractionType.FORM,
      payload: {
        event: 'VENDOR_PROFILE_ONBOARDED',
        summary: `Vendor/Expert profile onboarded with skills: [${dto.skills.join(', ')}]`,
        vendorProfileId: profile.id,
        maxCapacity: profile.maxCapacity,
      },
    });

    return profile;
  }

  async findAll(query: QueryVendorDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const where: any = {};

    if (query.skill) {
      where.skills = { has: query.skill };
    }

    if (query.ndaSigned !== undefined) {
      where.ndaSigned = String(query.ndaSigned) === 'true';
    }

    if (query.search) {
      where.person = {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const profiles = await this.prisma.vendorProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            vendorProjects: {
              where: { status: 'ACTIVE' },
              select: { id: true, title: true, stage: true },
            },
          },
        },
        _count: {
          select: { payouts: true },
        },
      },
    });

    const enriched = profiles.map((p) => {
      const activeProjectsCount = p.person.vendorProjects.length;
      const isAvailable = activeProjectsCount < p.maxCapacity;
      const capacityUtilizationPercent =
        p.maxCapacity > 0
          ? Math.round((activeProjectsCount / p.maxCapacity) * 100)
          : 100;

      return {
        id: p.id,
        personId: p.personId,
        fullName: p.person.fullName,
        email: p.person.email,
        phone: p.person.phone,
        skills: p.skills,
        maxCapacity: p.maxCapacity,
        activeProjectsCount,
        capacityUtilizationPercent,
        isAvailable,
        rating: p.rating,
        completedProjects: p.completedProjects,
        ndaSigned: p.ndaSigned,
        contractUrl: p.contractUrl,
        activeProjects: p.person.vendorProjects,
        totalPayoutsCount: p._count.payouts,
        createdAt: p.createdAt,
      };
    });

    const filtered =
      String(query.availableOnly) === 'true'
        ? enriched.filter((e) => e.isAvailable)
        : enriched;

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const profile = await this.prisma.vendorProfile.findFirst({
      where: {
        OR: [{ id }, { personId: id }],
      },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            vendorProjects: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                serviceType: true,
                stage: true,
                status: true,
                budget: true,
                createdAt: true,
              },
            },
          },
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          include: {
            project: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Vendor profile with ID ${id} not found`);
    }

    const activeProjects = profile.person.vendorProjects.filter(
      (p) => p.status === 'ACTIVE',
    );
    const activeProjectsCount = activeProjects.length;
    const isAvailable = activeProjectsCount < profile.maxCapacity;
    const capacityUtilizationPercent =
      profile.maxCapacity > 0
        ? Math.round((activeProjectsCount / profile.maxCapacity) * 100)
        : 100;

    return {
      ...profile,
      activeProjectsCount,
      capacityUtilizationPercent,
      isAvailable,
    };
  }

  async updateProfile(id: string, dto: UpdateVendorProfileDto) {
    const profile = await this.prisma.vendorProfile.findFirst({
      where: {
        OR: [{ id }, { personId: id }],
      },
    });

    if (!profile) {
      throw new NotFoundException(`Vendor profile with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.skills !== undefined) data.skills = dto.skills;
    if (dto.maxCapacity !== undefined) data.maxCapacity = dto.maxCapacity;
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.completedProjects !== undefined) {
      data.completedProjects = dto.completedProjects;
    }
    if (dto.contractUrl !== undefined) data.contractUrl = dto.contractUrl;
    if (dto.ndaSigned !== undefined) {
      data.ndaSigned = dto.ndaSigned;
      if (dto.ndaSigned && !profile.ndaSigned) {
        data.ndaSignedAt = new Date();
      }
    }

    return this.prisma.vendorProfile.update({
      where: { id: profile.id },
      data,
      include: {
        person: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async assignVendorToProject(dto: AssignVendorToProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    const vendorPerson = await this.prisma.person.findUnique({
      where: { id: dto.vendorPersonId },
      include: {
        vendorProfile: true,
        vendorProjects: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!vendorPerson) {
      throw new NotFoundException(
        `Vendor person with ID ${dto.vendorPersonId} not found`,
      );
    }

    if (!vendorPerson.vendorProfile) {
      throw new BadRequestException(
        `Person ${vendorPerson.fullName} does not have an active VendorProfile`,
      );
    }

    const activeCount = vendorPerson.vendorProjects.length;
    const maxCapacity = vendorPerson.vendorProfile.maxCapacity;

    if (activeCount >= maxCapacity) {
      throw new BadRequestException(
        `Cannot assign vendor: ${vendorPerson.fullName} is at maximum capacity (${activeCount}/${maxCapacity} active projects)`,
      );
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: dto.projectId },
      data: { vendorId: dto.vendorPersonId },
      include: {
        vendor: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.interactionsService.create({
      personId: vendorPerson.id,
      channel: Surface.APP,
      type: InteractionType.FORM,
      payload: {
        event: 'VENDOR_ASSIGNED_TO_PROJECT',
        summary: `Vendor assigned to project "${project.title}" (${project.serviceType})`,
        projectId: project.id,
        currentWorkload: activeCount + 1,
        maxCapacity,
      },
    });

    return updatedProject;
  }

  async createPayout(dto: CreateVendorPayoutDto) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: dto.vendorId },
      include: { person: true },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor profile with ID ${dto.vendorId} not found`);
    }

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    const payout = await this.prisma.vendorPayout.create({
      data: {
        vendorId: dto.vendorId,
        projectId: dto.projectId,
        milestoneId: dto.milestoneId || null,
        amount: dto.amount,
        status: (dto.status as any) || 'PENDING',
        notes: dto.notes,
      },
      include: {
        vendor: { include: { person: true } },
        project: { select: { id: true, title: true } },
      },
    });

    return payout;
  }

  async updatePayoutStatus(payoutId: string, dto: UpdatePayoutStatusDto) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: {
        vendor: { include: { person: true } },
        project: true,
      },
    });

    if (!payout) {
      throw new NotFoundException(`Vendor payout with ID ${payoutId} not found`);
    }

    const data: any = {
      status: dto.status as any,
    };

    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    if (dto.status === PayoutStatus.RELEASED && payout.status !== 'RELEASED') {
      data.releasedAt = new Date();
    }

    const updated = await this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data,
    });

    if (dto.status === PayoutStatus.RELEASED) {
      await this.interactionsService.create({
        personId: payout.vendor.personId,
        channel: Surface.APP,
        type: InteractionType.FORM,
        payload: {
          event: 'VENDOR_PAYOUT_RELEASED',
          summary: `Vendor payout of INR ${payout.amount} RELEASED for project "${payout.project.title}"`,
          payoutId: updated.id,
          amount: updated.amount,
          projectId: payout.projectId,
        },
      });
    }

    return updated;
  }

  async getPayouts(vendorId?: string, status?: PayoutStatus) {
    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;

    return this.prisma.vendorPayout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: {
            id: true,
            person: { select: { id: true, fullName: true, email: true } },
          },
        },
        project: {
          select: { id: true, title: true, serviceType: true },
        },
      },
    });
  }

  async getWorkloadAnalytics() {
    const profiles = await this.prisma.vendorProfile.findMany({
      include: {
        person: {
          select: {
            vendorProjects: {
              where: { status: 'ACTIVE' },
              select: { id: true },
            },
          },
        },
      },
    });

    let totalCapacity = 0;
    let totalAllocatedProjects = 0;
    let availableVendorsCount = 0;
    let topRatedVendorsCount = 0;

    for (const p of profiles) {
      totalCapacity += p.maxCapacity;
      const activeCount = p.person.vendorProjects.length;
      totalAllocatedProjects += activeCount;
      if (activeCount < p.maxCapacity) {
        availableVendorsCount++;
      }
      if (p.rating >= 4.5) {
        topRatedVendorsCount++;
      }
    }

    return {
      totalVendors: profiles.length,
      availableVendorsCount,
      totalCapacitySlots: totalCapacity,
      activeAllocatedProjects: totalAllocatedProjects,
      utilizationRatePercent:
        totalCapacity > 0
          ? Math.round((totalAllocatedProjects / totalCapacity) * 100)
          : 0,
      topRatedVendorsCount,
    };
  }
}
