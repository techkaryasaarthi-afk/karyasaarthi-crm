import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';

@Injectable()
export class UsersRbacService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStaffDto) {
    const existing = await this.prisma.staff.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A staff member with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const staff = await this.prisma.staff.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    return staff;
  }

  async findAll(query: QueryStaffDto) {
    const where: Prisma.StaffWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.staff.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        reviews: {
          take: 5,
          select: { id: true, stage: true, role: { select: { title: true } } },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID "${id}" not found`);
    }

    return staff;
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.findOne(id);

    const data: Prisma.StaffUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    if (dto.active !== undefined) {
      data.active = dto.active;
    }

    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(dto.password, salt);
    }

    return this.prisma.staff.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft-deactivate by setting active = false
    return this.prisma.staff.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });
  }
}
