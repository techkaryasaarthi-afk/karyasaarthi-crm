import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInteractionDto, QueryInteractionDto } from './dto/interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInteractionDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID "${dto.personId}" does not exist`);
    }

    if (dto.ownerId) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: dto.ownerId },
      });
      if (!staff) {
        throw new NotFoundException(`Staff member with ID "${dto.ownerId}" does not exist`);
      }
    }

    return this.prisma.interaction.create({
      data: {
        personId: dto.personId,
        channel: dto.channel,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
        ownerId: dto.ownerId || null,
      },
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
        owner: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async findAll(query: QueryInteractionDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InteractionWhereInput = {};

    if (query.personId) where.personId = query.personId;
    if (query.channel) where.channel = query.channel;
    if (query.type) where.type = query.type;
    if (query.ownerId) where.ownerId = query.ownerId;

    const [total, data] = await Promise.all([
      this.prisma.interaction.count({ where }),
      this.prisma.interaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          person: { select: { id: true, fullName: true, email: true, phone: true } },
          owner: { select: { id: true, name: true, role: true } },
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

  async findByPerson(personId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID "${personId}" not found`);
    }

    return this.prisma.interaction.findMany({
      where: { personId },
      orderBy: { occurredAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async findOne(id: string) {
    const interaction = await this.prisma.interaction.findUnique({
      where: { id },
      include: {
        person: true,
        owner: { select: { id: true, name: true, role: true } },
      },
    });

    if (!interaction) {
      throw new NotFoundException(`Interaction with ID "${id}" not found`);
    }

    return interaction;
  }

  async assignOwner(id: string, ownerId: string) {
    await this.findOne(id);
    const staff = await this.prisma.staff.findUnique({ where: { id: ownerId } });
    if (!staff) {
      throw new NotFoundException(`Staff member with ID "${ownerId}" not found`);
    }

    return this.prisma.interaction.update({
      where: { id },
      data: { ownerId },
      include: {
        person: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
