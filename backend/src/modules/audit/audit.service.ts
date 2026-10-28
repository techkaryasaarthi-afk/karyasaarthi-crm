import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAuditLogDto, QueryAuditLogDto } from './dto/audit.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto) {
    this.logger.log(`Audit: [${dto.action}] on ${dto.entity}:${dto.entityId} by actor ${dto.actorId || 'SYSTEM'}`);

    return this.prisma.auditLog.create({
      data: {
        actorId: dto.actorId || null,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        diff: dto.diff || {},
      },
    });
  }

  async findAll(query: QueryAuditLogDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.actorId) where.actorId = query.actorId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { at: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { at: 'desc' },
    });
  }
}
