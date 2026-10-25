import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PersonType, Surface } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePersonDto, UpdatePersonDto, QueryPersonDto } from './dto/person.dto';

@Injectable()
export class PersonsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Unified Identity Resolution Engine:
   * Recognizes the same person across all 4 surfaces (karyasaarthi.com, karyasaarthi.in, career, app).
   * Matches by email OR phone. If found, deduplicates and links; otherwise creates new record.
   */
  async findOrCreateOrLinkPerson(params: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    surface: Surface;
    type?: PersonType;
    consentFlags?: Record<string, any>;
  }) {
    const cleanEmail = params.email ? params.email.trim().toLowerCase() : undefined;
    const cleanPhone = params.phone ? params.phone.trim().replace(/\s+/g, '') : undefined;

    let existingPerson = null;

    if (cleanEmail) {
      existingPerson = await this.prisma.person.findUnique({
        where: { email: cleanEmail },
      });
    }

    if (!existingPerson && cleanPhone) {
      existingPerson = await this.prisma.person.findUnique({
        where: { phone: cleanPhone },
      });
    }

    if (existingPerson) {
      // Identity Stitching: Update missing data and merge consent flags
      const updateData: Prisma.PersonUpdateInput = {};

      if (!existingPerson.phone && cleanPhone) {
        updateData.phone = cleanPhone;
      }
      if (!existingPerson.email && cleanEmail) {
        updateData.email = cleanEmail;
      }
      if (params.fullName && existingPerson.fullName.trim() !== params.fullName.trim()) {
        updateData.fullName = params.fullName.trim();
      }

      // Merge consent flags
      if (params.consentFlags) {
        const existingFlags = (existingPerson.consentFlags as Record<string, any>) || {};
        updateData.consentFlags = { ...existingFlags, ...params.consentFlags };
      }

      // Type elevation: e.g. LEAD to CLIENT if converting
      if (params.type && existingPerson.type === PersonType.LEAD && params.type !== PersonType.LEAD) {
        updateData.type = params.type;
      }

      if (Object.keys(updateData).length > 0) {
        return this.prisma.person.update({
          where: { id: existingPerson.id },
          data: updateData,
        });
      }

      return existingPerson;
    }

    // If brand new contact across all surfaces, create unified record
    return this.prisma.person.create({
      data: {
        fullName: params.fullName.trim(),
        email: cleanEmail || null,
        phone: cleanPhone || null,
        type: params.type || PersonType.LEAD,
        firstTouchSource: params.surface,
        consentFlags: (params.consentFlags as Prisma.InputJsonValue) || {},
      },
    });
  }

  async create(dto: CreatePersonDto) {
    return this.findOrCreateOrLinkPerson({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      surface: dto.firstTouchSource,
      type: dto.type,
      consentFlags: dto.consentFlags,
    });
  }

  async findAll(query: QueryPersonDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PersonWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.firstTouchSource) {
      where.firstTouchSource = query.firstTouchSource;
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.person.count({ where }),
      this.prisma.person.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              interactions: true,
              clientProjects: true,
              vendorProjects: true,
              applications: true,
            },
          },
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

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        interactions: {
          orderBy: { occurredAt: 'desc' },
          include: { owner: { select: { id: true, name: true, role: true } } },
        },
        clientProjects: {
          orderBy: { createdAt: 'desc' },
        },
        vendorProjects: {
          orderBy: { createdAt: 'desc' },
        },
        applications: {
          include: { role: true, reviewer: { select: { id: true, name: true } } },
        },
      },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID "${id}" not found`);
    }

    return person;
  }

  async update(id: string, dto: UpdatePersonDto) {
    await this.findOne(id);

    const cleanEmail = dto.email ? dto.email.trim().toLowerCase() : undefined;
    const cleanPhone = dto.phone ? dto.phone.trim().replace(/\s+/g, '') : undefined;

    // Check unique constraints if changing email or phone
    if (cleanEmail) {
      const existing = await this.prisma.person.findUnique({ where: { email: cleanEmail } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Another person with this email already exists');
      }
    }

    if (cleanPhone) {
      const existing = await this.prisma.person.findUnique({ where: { phone: cleanPhone } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Another person with this phone number already exists');
      }
    }

    const updateData: Prisma.PersonUpdateInput = {};
    if (dto.fullName) updateData.fullName = dto.fullName.trim();
    if (cleanEmail !== undefined) updateData.email = cleanEmail;
    if (cleanPhone !== undefined) updateData.phone = cleanPhone;
    if (dto.type) updateData.type = dto.type;
    if (dto.consentFlags) updateData.consentFlags = dto.consentFlags as Prisma.InputJsonValue;

    return this.prisma.person.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.person.delete({
      where: { id },
    });
  }
}
