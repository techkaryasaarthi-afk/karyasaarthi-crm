import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  Surface,
  Role,
  PricingModel,
  PricingConditionType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateServiceItemDto,
  UpdateServiceItemDto,
  QueryServiceItemDto,
  CalculateQuoteDto,
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  QueryPricingRuleDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  QueryFeatureFlagDto,
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
  QueryRoutingRuleDto,
  EvaluateLeadRoutingDto,
} from './dto/admin-control.dto';

@Injectable()
export class AdminControlService {
  private readonly logger = new Logger(AdminControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) { }

  // ==========================================
  // 1. SERVICE CATALOGUE OPERATIONS
  // ==========================================

  async createService(dto: CreateServiceItemDto, actorId?: string) {
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.title);

    const existing = await this.prisma.serviceItem.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Service with slug '${slug}' already exists`);
    }

    const service = await this.prisma.serviceItem.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        category: dto.category,
        basePrice: dto.basePrice,
        currency: dto.currency || 'INR',
        pricingModel: dto.pricingModel || PricingModel.FIXED,
        deliverables: dto.deliverables || [],
        surfaces: dto.surfaces && dto.surfaces.length > 0 ? dto.surfaces : [Surface.SITE_COM, Surface.SITE_IN, Surface.APP],
        active: dto.active !== undefined ? dto.active : true,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SERVICE_ITEM_CREATED',
      entity: 'ServiceItem',
      entityId: service.id,
      diff: { title: service.title, slug: service.slug, basePrice: service.basePrice, category: service.category },
    });

    this.logger.log(`Created service item: ${service.title} (${service.id})`);
    return service;
  }

  async updateService(id: string, dto: UpdateServiceItemDto, actorId?: string) {
    const service = await this.findServiceById(id);

    let slug = service.slug;
    if (dto.slug && dto.slug !== service.slug) {
      slug = this.slugify(dto.slug);
      const existing = await this.prisma.serviceItem.findUnique({ where: { slug } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Service with slug '${slug}' already exists`);
      }
    } else if (dto.title && !dto.slug && dto.title !== service.title) {
      // Optional: keep existing slug unless explicitly given
    }

    const updated = await this.prisma.serviceItem.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        category: dto.category,
        basePrice: dto.basePrice,
        currency: dto.currency,
        pricingModel: dto.pricingModel,
        deliverables: dto.deliverables,
        surfaces: dto.surfaces,
        active: dto.active,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SERVICE_ITEM_UPDATED',
      entity: 'ServiceItem',
      entityId: id,
      diff: { before: service, after: updated },
    });

    return updated;
  }

  async deleteService(id: string, actorId?: string) {
    const service = await this.findServiceById(id);

    await this.prisma.serviceItem.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'SERVICE_ITEM_DELETED',
      entity: 'ServiceItem',
      entityId: id,
      diff: { title: service.title, slug: service.slug },
    });

    return { message: `Service '${service.title}' deleted successfully` };
  }

  async findServiceById(id: string) {
    const service = await this.prisma.serviceItem.findUnique({
      where: { id },
      include: { pricingRules: { where: { active: true } } },
    });
    if (!service) {
      throw new NotFoundException(`Service item with ID '${id}' not found`);
    }
    return service;
  }

  async findServiceBySlug(slug: string) {
    const service = await this.prisma.serviceItem.findUnique({
      where: { slug },
      include: { pricingRules: { where: { active: true } } },
    });
    if (!service) {
      throw new NotFoundException(`Service item with slug '${slug}' not found`);
    }
    return service;
  }

  async findAllServices(query: QueryServiceItemDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceItemWhereInput = {};

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query.active !== undefined) {
      where.active = query.active;
    }
    if (query.surface) {
      where.surfaces = { has: query.surface };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.serviceItem.count({ where }),
      this.prisma.serviceItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { basePrice: 'asc' }],
        include: {
          _count: { select: { pricingRules: true } },
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

  async getPublicServices(surface?: Surface) {
    const where: Prisma.ServiceItemWhereInput = {
      active: true,
    };

    if (surface) {
      where.surfaces = { has: surface };
    }

    return this.prisma.serviceItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { basePrice: 'asc' }],
      include: {
        pricingRules: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            conditionType: true,
            discountPercentage: true,
            markupPercentage: true,
            minBudget: true,
            targetSurface: true,
          },
        },
      },
    });
  }

  /**
   * Calculates a dynamic price quote based on service base price, units of work,
   * surface origin, and active pricing rules.
   */
  async calculateDynamicQuote(dto: CalculateQuoteDto) {
    // 1. Resolve Service by ID or Slug
    let service = await this.prisma.serviceItem.findUnique({
      where: { id: dto.serviceIdentifier },
      include: { pricingRules: { where: { active: true } } },
    });

    if (!service) {
      service = await this.prisma.serviceItem.findUnique({
        where: { slug: dto.serviceIdentifier },
        include: { pricingRules: { where: { active: true } } },
      });
    }

    if (!service) {
      throw new NotFoundException(`Service '${dto.serviceIdentifier}' not found`);
    }

    const scopeUnits = dto.scopeUnits && dto.scopeUnits > 0 ? dto.scopeUnits : 1;
    const subtotal = service.basePrice * scopeUnits;
    const now = new Date();

    // 2. Fetch all applicable rules (both service-specific and global rules)
    const applicableRules = await this.prisma.pricingRule.findMany({
      where: {
        active: true,
        OR: [{ serviceId: service.id }, { serviceId: null }],
        AND: [
          { OR: [{ targetSurface: null }, { targetSurface: dto.surface }] },
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
    });

    let totalDiscountPercent = 0;
    let totalMarkupPercent = 0;
    const appliedRules: any[] = [];

    for (const rule of applicableRules) {
      let isEligible = true;

      // Condition: MIN_BUDGET
      if (rule.conditionType === PricingConditionType.MIN_BUDGET) {
        const testBudget = dto.budget !== undefined ? dto.budget : subtotal;
        if (rule.minBudget && testBudget < rule.minBudget) {
          isEligible = false;
        }
      }

      // Condition: SURFACE_PROMO
      if (rule.conditionType === PricingConditionType.SURFACE_PROMO) {
        if (rule.targetSurface && rule.targetSurface !== dto.surface) {
          isEligible = false;
        }
      }

      if (isEligible) {
        if (rule.discountPercentage) {
          totalDiscountPercent += rule.discountPercentage;
        }
        if (rule.markupPercentage) {
          totalMarkupPercent += rule.markupPercentage;
        }

        appliedRules.push({
          ruleId: rule.id,
          name: rule.name,
          conditionType: rule.conditionType,
          discountPercentage: rule.discountPercentage || 0,
          markupPercentage: rule.markupPercentage || 0,
        });
      }
    }

    // Cap total discount at 90%
    const effectiveDiscountPercent = Math.min(totalDiscountPercent, 90);
    const discountAmount = Math.round((subtotal * effectiveDiscountPercent) / 100);
    const markupAmount = Math.round((subtotal * totalMarkupPercent) / 100);
    const estimatedTotal = Math.max(0, subtotal - discountAmount + markupAmount);

    return {
      service: {
        id: service.id,
        title: service.title,
        slug: service.slug,
        category: service.category,
        pricingModel: service.pricingModel,
        basePrice: service.basePrice,
        currency: service.currency,
        deliverables: service.deliverables,
      },
      quote: {
        scopeUnits,
        subtotal,
        discountPercent: effectiveDiscountPercent,
        discountAmount,
        markupPercent: totalMarkupPercent,
        markupAmount,
        estimatedTotal,
        currency: service.currency,
      },
      appliedRules,
    };
  }

  // ==========================================
  // 2. PRICING RULES OPERATIONS
  // ==========================================

  async createPricingRule(dto: CreatePricingRuleDto, actorId?: string) {
    if (dto.serviceId) {
      await this.findServiceById(dto.serviceId);
    }

    const rule = await this.prisma.pricingRule.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        serviceId: dto.serviceId || null,
        conditionType: dto.conditionType,
        discountPercentage: dto.discountPercentage || null,
        markupPercentage: dto.markupPercentage || null,
        minBudget: dto.minBudget || null,
        targetSurface: dto.targetSurface || null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        active: dto.active !== undefined ? dto.active : true,
      },
      include: {
        service: { select: { id: true, title: true, slug: true } },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'PRICING_RULE_CREATED',
      entity: 'PricingRule',
      entityId: rule.id,
      diff: { name: rule.name, conditionType: rule.conditionType, discountPercentage: rule.discountPercentage },
    });

    return rule;
  }

  async updatePricingRule(id: string, dto: UpdatePricingRuleDto, actorId?: string) {
    const existing = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Pricing rule with ID '${id}' not found`);
    }

    if (dto.serviceId) {
      await this.findServiceById(dto.serviceId);
    }

    const updated = await this.prisma.pricingRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        serviceId: dto.serviceId,
        conditionType: dto.conditionType,
        discountPercentage: dto.discountPercentage,
        markupPercentage: dto.markupPercentage,
        minBudget: dto.minBudget,
        targetSurface: dto.targetSurface,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        active: dto.active,
      },
      include: {
        service: { select: { id: true, title: true, slug: true } },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'PRICING_RULE_UPDATED',
      entity: 'PricingRule',
      entityId: id,
      diff: { before: existing, after: updated },
    });

    return updated;
  }

  async deletePricingRule(id: string, actorId?: string) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Pricing rule with ID '${id}' not found`);
    }

    await this.prisma.pricingRule.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'PRICING_RULE_DELETED',
      entity: 'PricingRule',
      entityId: id,
      diff: { name: rule.name },
    });

    return { message: `Pricing rule '${rule.name}' deleted successfully` };
  }

  async findAllPricingRules(query: QueryPricingRuleDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PricingRuleWhereInput = {};

    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.conditionType) where.conditionType = query.conditionType;
    if (query.targetSurface) where.targetSurface = query.targetSurface;
    if (query.active !== undefined) where.active = query.active;

    const [total, data] = await Promise.all([
      this.prisma.pricingRule.count({ where }),
      this.prisma.pricingRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { id: true, title: true, slug: true } },
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

  // ==========================================
  // 3. SURFACE FEATURE FLAGS OPERATIONS
  // ==========================================

  async createFeatureFlag(dto: CreateFeatureFlagDto, actorId?: string) {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Feature flag with key '${dto.key}' already exists`);
    }

    const flag = await this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description || null,
        enabled: dto.enabled !== undefined ? dto.enabled : true,
        surface: dto.surface || null,
        rolloutPercentage: dto.rolloutPercentage !== undefined ? dto.rolloutPercentage : 100,
        config: dto.config || {},
      },
    });

    await this.auditService.log({
      actorId,
      action: 'FEATURE_FLAG_CREATED',
      entity: 'FeatureFlag',
      entityId: flag.id,
      diff: { key: flag.key, enabled: flag.enabled, surface: flag.surface },
    });

    return flag;
  }

  async updateFeatureFlag(id: string, dto: UpdateFeatureFlagDto, actorId?: string) {
    const existing = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Feature flag with ID '${id}' not found`);
    }

    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        enabled: dto.enabled,
        surface: dto.surface,
        rolloutPercentage: dto.rolloutPercentage,
        config: dto.config,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'FEATURE_FLAG_UPDATED',
      entity: 'FeatureFlag',
      entityId: id,
      diff: { before: existing, after: updated },
    });

    return updated;
  }

  async deleteFeatureFlag(id: string, actorId?: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException(`Feature flag with ID '${id}' not found`);
    }

    await this.prisma.featureFlag.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'FEATURE_FLAG_DELETED',
      entity: 'FeatureFlag',
      entityId: id,
      diff: { key: flag.key },
    });

    return { message: `Feature flag '${flag.key}' deleted successfully` };
  }

  async findAllFeatureFlags(query: QueryFeatureFlagDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.FeatureFlagWhereInput = {};

    if (query.surface) {
      where.OR = [{ surface: null }, { surface: query.surface }];
    }
    if (query.enabled !== undefined) {
      where.enabled = query.enabled;
    }
    if (query.search) {
      where.OR = [
        { key: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.featureFlag.count({ where }),
      this.prisma.featureFlag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { key: 'asc' },
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

  /**
   * Public endpoint helper: Returns active feature flags for a given surface
   * formatted as an easily queryable key-value dictionary and structured list.
   */
  async getPublicFeatureFlags(surface?: Surface) {
    const flags = await this.prisma.featureFlag.findMany({
      where: {
        enabled: true,
        OR: [{ surface: null }, { surface }],
      },
      orderBy: { key: 'asc' },
    });

    const flagMap: Record<string, boolean> = {};
    const configMap: Record<string, any> = {};

    for (const flag of flags) {
      flagMap[flag.key] = flag.enabled;
      configMap[flag.key] = {
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        config: flag.config,
      };
    }

    return {
      surface: surface || 'ALL',
      flags: flagMap,
      details: configMap,
    };
  }

  // ==========================================
  // 4. PIPELINE ROUTING RULES OPERATIONS
  // ==========================================

  async createRoutingRule(dto: CreateRoutingRuleDto, actorId?: string) {
    if (dto.assignedStaffId) {
      const staff = await this.prisma.staff.findUnique({ where: { id: dto.assignedStaffId } });
      if (!staff) {
        throw new NotFoundException(`Staff member with ID '${dto.assignedStaffId}' not found`);
      }
    }

    const rule = await this.prisma.routingRule.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        priority: dto.priority || 0,
        sourceSurface: dto.sourceSurface || null,
        serviceCategory: dto.serviceCategory || null,
        minEstimatedValue: dto.minEstimatedValue || null,
        keywordMatch: dto.keywordMatch || [],
        assignedStaffId: dto.assignedStaffId || null,
        targetRole: dto.targetRole || Role.SALES,
        active: dto.active !== undefined ? dto.active : true,
      },
      include: {
        assignedStaff: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'ROUTING_RULE_CREATED',
      entity: 'RoutingRule',
      entityId: rule.id,
      diff: { name: rule.name, priority: rule.priority, assignedStaffId: rule.assignedStaffId },
    });

    return rule;
  }

  async updateRoutingRule(id: string, dto: UpdateRoutingRuleDto, actorId?: string) {
    const existing = await this.prisma.routingRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Routing rule with ID '${id}' not found`);
    }

    if (dto.assignedStaffId) {
      const staff = await this.prisma.staff.findUnique({ where: { id: dto.assignedStaffId } });
      if (!staff) {
        throw new NotFoundException(`Staff member with ID '${dto.assignedStaffId}' not found`);
      }
    }

    const updated = await this.prisma.routingRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        sourceSurface: dto.sourceSurface,
        serviceCategory: dto.serviceCategory,
        minEstimatedValue: dto.minEstimatedValue,
        keywordMatch: dto.keywordMatch,
        assignedStaffId: dto.assignedStaffId,
        targetRole: dto.targetRole,
        active: dto.active,
      },
      include: {
        assignedStaff: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'ROUTING_RULE_UPDATED',
      entity: 'RoutingRule',
      entityId: id,
      diff: { before: existing, after: updated },
    });

    return updated;
  }

  async deleteRoutingRule(id: string, actorId?: string) {
    const rule = await this.prisma.routingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Routing rule with ID '${id}' not found`);
    }

    await this.prisma.routingRule.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'ROUTING_RULE_DELETED',
      entity: 'RoutingRule',
      entityId: id,
      diff: { name: rule.name },
    });

    return { message: `Routing rule '${rule.name}' deleted successfully` };
  }

  async findAllRoutingRules(query: QueryRoutingRuleDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RoutingRuleWhereInput = {};

    if (query.sourceSurface) where.sourceSurface = query.sourceSurface;
    if (query.active !== undefined) where.active = query.active;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { serviceCategory: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.routingRule.count({ where }),
      this.prisma.routingRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          assignedStaff: { select: { id: true, name: true, email: true, role: true } },
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



  async evaluateLeadRouting(dto: EvaluateLeadRoutingDto): Promise<{
    matchedRule: any | null;
    assignedStaffId: string | null;
    reason: string;
  }> {
    const activeRules = await this.prisma.routingRule.findMany({
      where: { active: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        assignedStaff: { select: { id: true, name: true, active: true } },
      },
    });

    const textToMatch = `${dto.title} ${dto.notes || ''} ${dto.serviceType || ''}`.toLowerCase();

    for (const rule of activeRules) {
      let isMatch = true;

      // 1. Surface check
      if (rule.sourceSurface && rule.sourceSurface !== dto.sourceSurface) {
        isMatch = false;
      }

      // 2. Service category check
      if (isMatch && rule.serviceCategory) {
        const serviceCategoryLower = rule.serviceCategory.toLowerCase();
        const incomingServiceLower = (dto.serviceType || '').toLowerCase();
        if (!incomingServiceLower.includes(serviceCategoryLower) && !textToMatch.includes(serviceCategoryLower)) {
          isMatch = false;
        }
      }

      // 3. Minimum estimated value check
      if (isMatch && rule.minEstimatedValue) {
        const value = dto.estimatedValue || 0;
        if (value < rule.minEstimatedValue) {
          isMatch = false;
        }
      }

      // 4. Keyword match check
      if (isMatch && rule.keywordMatch && rule.keywordMatch.length > 0) {
        const hasKeyword = rule.keywordMatch.some((kw) => textToMatch.includes(kw.toLowerCase()));
        if (!hasKeyword) {
          isMatch = false;
        }
      }

      // If all conditions passed, this rule is our top priority match!
      if (isMatch) {
        if (rule.assignedStaffId && rule.assignedStaff?.active) {
          return {
            matchedRule: { id: rule.id, name: rule.name, priority: rule.priority },
            assignedStaffId: rule.assignedStaffId,
            reason: `Direct rule match: '${rule.name}' routed to staff '${rule.assignedStaff.name}'`,
          };
        }

        // Fallback to least loaded staff in targetRole
        const targetRole = rule.targetRole || Role.SALES;
        const candidateStaff = await this.prisma.staff.findMany({
          where: { role: targetRole, active: true },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                assignedLeads: {
                  where: { stage: { notIn: ['WON', 'LOST'] } },
                },
              },
            },
          },
          orderBy: {
            assignedLeads: { _count: 'asc' },
          },
        });

        if (candidateStaff.length > 0) {
          const selected = candidateStaff[0];
          return {
            matchedRule: { id: rule.id, name: rule.name, priority: rule.priority },
            assignedStaffId: selected.id,
            reason: `Role-based rule match: '${rule.name}' routed to least loaded ${targetRole} ('${selected.name}')`,
          };
        }
      }
    }

    return {
      matchedRule: null,
      assignedStaffId: null,
      reason: 'No routing rule matched; fallback to standard round-robin',
    };
  }

  private slugify(text: string): string {
    const baseSlug = text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${randomSuffix}`;
  }
}
