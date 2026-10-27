import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import {
  OnboardAmbassadorDto,
  UpdateAmbassadorDto,
  RecordReferralDto,
  QueryAmbassadorDto,
} from './dto/ambassador.dto';
import { Surface, InteractionType } from '@prisma/client';

@Injectable()
export class AmbassadorsService {
  private readonly logger = new Logger(AmbassadorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionsService: InteractionsService,
  ) {}

  async onboard(dto: OnboardAmbassadorDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
      include: { campusAmbassador: true },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID "${dto.personId}" not found`);
    }

    if (person.campusAmbassador) {
      throw new BadRequestException(
        `Person ${person.fullName} is already registered as a Campus Ambassador (Code: ${person.campusAmbassador.referralCode})`,
      );
    }

    let code = (dto.customReferralCode || '').trim().toUpperCase();
    if (!code) {
      const sanitizedName = person.fullName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
      code = `KS-${sanitizedName}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check code collision
    const existingCode = await this.prisma.campusAmbassador.findUnique({
      where: { referralCode: code },
    });
    if (existingCode) {
      throw new BadRequestException(`Referral code "${code}" is already taken. Please choose another.`);
    }

    const ambassador = await this.prisma.campusAmbassador.create({
      data: {
        personId: dto.personId,
        college: dto.college,
        graduationYear: dto.graduationYear,
        referralCode: code,
      },
      include: {
        person: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    await this.interactionsService.create({
      personId: person.id,
      channel: Surface.APP,
      type: InteractionType.FORM,
      payload: {
        event: 'CAMPUS_AMBASSADOR_ONBOARDED',
        summary: `Campus Ambassador registered: ${person.fullName} (${dto.college}) with Code: ${code}`,
        referralCode: code,
        ambassadorId: ambassador.id,
      },
    });

    return ambassador;
  }

  async findAll(query: QueryAmbassadorDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.college) {
      where.college = { contains: query.college, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { referralCode: { contains: query.search, mode: 'insensitive' } },
        { college: { contains: query.search, mode: 'insensitive' } },
        {
          person: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [ambassadors, total] = await Promise.all([
      this.prisma.campusAmbassador.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ successfulConversions: 'desc' }, { totalReferrals: 'desc' }],
        include: {
          person: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          _count: {
            select: { referrals: true },
          },
        },
      }),
      this.prisma.campusAmbassador.count({ where }),
    ]);

    return {
      data: ambassadors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const ambassador = await this.prisma.campusAmbassador.findFirst({
      where: {
        OR: [{ id }, { referralCode: id.toUpperCase() }, { personId: id }],
      },
      include: {
        person: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        referrals: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            referredPerson: {
              select: { id: true, fullName: true, email: true, type: true },
            },
          },
        },
      },
    });

    if (!ambassador) {
      throw new NotFoundException(`Ambassador with identifier "${id}" not found`);
    }

    return ambassador;
  }

  async update(id: string, dto: UpdateAmbassadorDto) {
    const ambassador = await this.findOne(id);

    const data: any = {};
    if (dto.college !== undefined) data.college = dto.college;
    if (dto.graduationYear !== undefined) data.graduationYear = dto.graduationYear;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.campusAmbassador.update({
      where: { id: ambassador.id },
      data,
      include: {
        person: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async recordReferral(dto: RecordReferralDto) {
    const code = dto.referralCode.trim().toUpperCase();
    const ambassador = await this.prisma.campusAmbassador.findUnique({
      where: { referralCode: code },
    });

    if (!ambassador) {
      throw new NotFoundException(`Campus Ambassador referral code "${code}" does not exist`);
    }

    const referredPerson = await this.prisma.person.findUnique({
      where: { id: dto.referredPersonId },
    });
    if (!referredPerson) {
      throw new NotFoundException(`Referred person with ID "${dto.referredPersonId}" not found`);
    }

    const reward = dto.rewardAmount !== undefined ? dto.rewardAmount : 100;

    const referral = await this.prisma.ambassadorReferral.create({
      data: {
        ambassadorId: ambassador.id,
        referredPersonId: referredPerson.id,
        type: dto.type || 'LEAD',
        status: 'ATTRIBUTED',
        rewardAmount: reward,
      },
      include: {
        ambassador: { include: { person: true } },
        referredPerson: true,
      },
    });

    await this.prisma.campusAmbassador.update({
      where: { id: ambassador.id },
      data: {
        totalReferrals: { increment: 1 },
        commissionEarned: { increment: reward },
      },
    });

    await this.interactionsService.create({
      personId: referredPerson.id,
      channel: Surface.APP,
      type: InteractionType.FORM,
      payload: {
        event: 'AMBASSADOR_REFERRAL_ATTRIBUTED',
        summary: `Attributed via Campus Ambassador ${ambassador.referralCode} (${dto.type || 'LEAD'})`,
        ambassadorId: ambassador.id,
        rewardAmount: reward,
      },
    });

    return referral;
  }

  async getLeaderboard(limit = 10) {
    const count = Number(limit) || 10;

    const topAmbassadors = await this.prisma.campusAmbassador.findMany({
      where: { status: 'ACTIVE' },
      take: count,
      orderBy: [{ successfulConversions: 'desc' }, { totalReferrals: 'desc' }],
      include: {
        person: {
          select: { fullName: true },
        },
      },
    });

    return topAmbassadors.map((amb, index) => ({
      rank: index + 1,
      id: amb.id,
      name: amb.person.fullName,
      college: amb.college,
      referralCode: amb.referralCode,
      totalReferrals: amb.totalReferrals,
      successfulConversions: amb.successfulConversions,
      commissionEarned: amb.commissionEarned,
    }));
  }
}
