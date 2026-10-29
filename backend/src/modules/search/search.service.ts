import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  GlobalSearchQueryDto,
  QuickSearchQueryDto,
  SearchableEntity,
  SearchResultItem,
  GlobalSearchResponse,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive cross-entity global search across leads, projects, applicants,
   * persons, services, invoices, and staff.
   */
  async searchAll(dto: GlobalSearchQueryDto): Promise<GlobalSearchResponse> {
    const rawQuery = dto.q.trim();
    const queryLower = rawQuery.toLowerCase();
    const limit = dto.limit || 5;

    const requestedEntities = dto.entities && dto.entities.length > 0
      ? new Set(dto.entities)
      : new Set(Object.values(SearchableEntity));

    const tasks: Promise<SearchResultItem[]>[] = [];

    if (requestedEntities.has(SearchableEntity.LEADS)) {
      tasks.push(this.searchLeads(rawQuery, queryLower, limit, dto.surface));
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (requestedEntities.has(SearchableEntity.PROJECTS)) {
      tasks.push(this.searchProjects(rawQuery, queryLower, limit, dto.surface));
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (requestedEntities.has(SearchableEntity.APPLICATIONS)) {
      tasks.push(this.searchApplications(rawQuery, queryLower, limit));
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (requestedEntities.has(SearchableEntity.PERSONS)) {
      tasks.push(this.searchPersons(rawQuery, queryLower, limit));
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (requestedEntities.has(SearchableEntity.SERVICES)) {
      tasks.push(this.searchServices(rawQuery, queryLower, limit, dto.surface));
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (requestedEntities.has(SearchableEntity.INVOICES)) {
      tasks.push(this.searchInvoices(rawQuery, queryLower, limit));
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (requestedEntities.has(SearchableEntity.STAFF)) {
      tasks.push(this.searchStaff(rawQuery, queryLower, limit));
    } else {
      tasks.push(Promise.resolve([]));
    }

    const [leads, projects, applications, persons, services, invoices, staff] = await Promise.all(tasks);

    const categories = {
      leads,
      projects,
      applications,
      persons,
      services,
      invoices,
      staff,
    };

    const flatResults = [
      ...leads,
      ...projects,
      ...applications,
      ...persons,
      ...services,
      ...invoices,
      ...staff,
    ].sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      query: rawQuery,
      totalResults: flatResults.length,
      categories,
      flatResults,
    };
  }

  /**
   * Fast autocomplete quick-jump search for Cmd+K search modals.
   */
  async quickSearch(dto: QuickSearchQueryDto): Promise<{ query: string; results: SearchResultItem[] }> {
    const rawQuery = dto.q.trim();
    const queryLower = rawQuery.toLowerCase();
    const limit = dto.limit || 8;

    // Fetch top 3 per category concurrently for diverse quick jump
    const [leads, projects, persons, services] = await Promise.all([
      this.searchLeads(rawQuery, queryLower, 3),
      this.searchProjects(rawQuery, queryLower, 3),
      this.searchPersons(rawQuery, queryLower, 3),
      this.searchServices(rawQuery, queryLower, 3),
    ]);

    const combined = [...leads, ...projects, ...persons, ...services]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return {
      query: rawQuery,
      results: combined,
    };
  }

  // ==========================================
  // INDIVIDUAL ENTITY SEARCH RUNNERS
  // ==========================================

  private async searchLeads(
    q: string,
    qLower: string,
    limit: number,
    surface?: any,
  ): Promise<SearchResultItem[]> {
    const where: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { serviceType: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { person: { fullName: { contains: q, mode: 'insensitive' } } },
        { person: { email: { contains: q, mode: 'insensitive' } } },
        { person: { phone: { contains: q, mode: 'insensitive' } } },
      ],
    };

    if (surface) {
      where.sourceSurface = surface;
    }

    const records = await this.prisma.lead.findMany({
      where,
      take: limit,
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((lead) => {
      const score = this.calculateRelevance(lead.title, qLower, lead.person.fullName);
      return {
        id: lead.id,
        entityType: SearchableEntity.LEADS,
        title: lead.title,
        subtitle: `${lead.person.fullName} (${lead.person.email || lead.person.phone || 'No contact'})`,
        badge: `Lead (${lead.stage})`,
        status: lead.stage,
        url: `/leads/${lead.id}`,
        surface: lead.sourceSurface,
        relevanceScore: score,
        metadata: {
          leadScore: lead.score,
          urgency: lead.urgency,
          estimatedValue: lead.estimatedValue,
          serviceType: lead.serviceType,
        },
        createdAt: lead.createdAt,
      };
    });
  }

  private async searchProjects(
    q: string,
    qLower: string,
    limit: number,
    surface?: any,
  ): Promise<SearchResultItem[]> {
    const where: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { serviceType: { contains: q, mode: 'insensitive' } },
        { client: { fullName: { contains: q, mode: 'insensitive' } } },
        { client: { email: { contains: q, mode: 'insensitive' } } },
      ],
    };

    if (surface) {
      where.sourceSurface = surface;
    }

    const records = await this.prisma.project.findMany({
      where,
      take: limit,
      include: {
        client: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((project) => {
      const score = this.calculateRelevance(project.title, qLower, project.client.fullName);
      return {
        id: project.id,
        entityType: SearchableEntity.PROJECTS,
        title: project.title,
        subtitle: `Client: ${project.client.fullName} • ${project.serviceType}`,
        badge: `Project (${project.stage})`,
        status: project.status,
        url: `/projects/${project.id}`,
        surface: project.sourceSurface,
        relevanceScore: score,
        metadata: {
          stage: project.stage,
          status: project.status,
          serviceType: project.serviceType,
        },
        createdAt: project.createdAt,
      };
    });
  }

  private async searchApplications(
    q: string,
    qLower: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const records = await this.prisma.application.findMany({
      where: {
        OR: [
          { person: { fullName: { contains: q, mode: 'insensitive' } } },
          { person: { email: { contains: q, mode: 'insensitive' } } },
          { person: { phone: { contains: q, mode: 'insensitive' } } },
          { role: { title: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: limit,
      include: {
        person: { select: { id: true, fullName: true, email: true, phone: true } },
        role: { select: { id: true, title: true, department: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    return records.map((app) => {
      const score = this.calculateRelevance(app.person.fullName, qLower, app.role.title);
      return {
        id: app.id,
        entityType: SearchableEntity.APPLICATIONS,
        title: app.person.fullName,
        subtitle: `Role: ${app.role.title} • ${app.person.email || app.person.phone}`,
        badge: `Applicant (${app.stage})`,
        status: app.stage,
        url: `/careers/applications/${app.id}`,
        relevanceScore: score,
        metadata: {
          roleId: app.roleId,
          roleTitle: app.role.title,
          department: app.role.department,
          stage: app.stage,
        },
        createdAt: app.appliedAt,
      };
    });
  }

  private async searchPersons(
    q: string,
    qLower: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const records = await this.prisma.person.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((person) => {
      const score = this.calculateRelevance(person.fullName, qLower, person.email || '');
      return {
        id: person.id,
        entityType: SearchableEntity.PERSONS,
        title: person.fullName,
        subtitle: `${person.email || ''} ${person.phone ? '• ' + person.phone : ''}`.trim(),
        badge: `Person (${person.type})`,
        status: person.type,
        url: `/persons/${person.id}`,
        surface: person.firstTouchSource,
        relevanceScore: score,
        metadata: {
          type: person.type,
          firstTouchSource: person.firstTouchSource,
        },
        createdAt: person.createdAt,
      };
    });
  }

  private async searchServices(
    q: string,
    qLower: string,
    limit: number,
    surface?: any,
  ): Promise<SearchResultItem[]> {
    const where: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (surface) {
      where.surfaces = { has: surface };
    }

    const records = await this.prisma.serviceItem.findMany({
      where,
      take: limit,
      orderBy: { basePrice: 'asc' },
    });

    return records.map((svc) => {
      const score = this.calculateRelevance(svc.title, qLower, svc.category);
      return {
        id: svc.id,
        entityType: SearchableEntity.SERVICES,
        title: svc.title,
        subtitle: `${svc.category} • ₹${svc.basePrice.toLocaleString('en-IN')} (${svc.pricingModel})`,
        badge: `Service (${svc.pricingModel})`,
        status: svc.active ? 'ACTIVE' : 'INACTIVE',
        url: `/admin-control/services/${svc.id}`,
        relevanceScore: score,
        metadata: {
          slug: svc.slug,
          category: svc.category,
          basePrice: svc.basePrice,
          pricingModel: svc.pricingModel,
        },
        createdAt: svc.createdAt,
      };
    });
  }

  private async searchInvoices(
    q: string,
    qLower: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const records = await this.prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { client: { fullName: { contains: q, mode: 'insensitive' } } },
          { client: { email: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: limit,
      include: {
        client: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((inv) => {
      const score = this.calculateRelevance(inv.invoiceNumber, qLower, inv.title);
      return {
        id: inv.id,
        entityType: SearchableEntity.INVOICES,
        title: `${inv.invoiceNumber} — ${inv.title}`,
        subtitle: `Client: ${inv.client.fullName} • ₹${inv.totalAmount.toLocaleString('en-IN')}`,
        badge: `Invoice (${inv.status})`,
        status: inv.status,
        url: `/payments/invoices/${inv.id}`,
        relevanceScore: score,
        metadata: {
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          status: inv.status,
        },
        createdAt: inv.createdAt,
      };
    });
  }

  private async searchStaff(
    q: string,
    qLower: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const records = await this.prisma.staff.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return records.map((staff) => {
      const score = this.calculateRelevance(staff.name, qLower, staff.email);
      return {
        id: staff.id,
        entityType: SearchableEntity.STAFF,
        title: staff.name,
        subtitle: `${staff.email} • Role: ${staff.role}`,
        badge: `Staff (${staff.role})`,
        status: staff.active ? 'ACTIVE' : 'INACTIVE',
        url: `/users-rbac/staff/${staff.id}`,
        relevanceScore: score,
        metadata: {
          role: staff.role,
          active: staff.active,
        },
        createdAt: new Date(),
      };
    });
  }

  /**
   * Helper algorithm to compute normalized relevance score (1-100).
   */
  private calculateRelevance(primaryText: string, queryLower: string, secondaryText?: string): number {
    const primaryLower = (primaryText || '').toLowerCase();
    const secondaryLower = (secondaryText || '').toLowerCase();

    // Exact match
    if (primaryLower === queryLower) return 100;
    // Prefix match on primary
    if (primaryLower.startsWith(queryLower)) return 85;
    // Word boundary match in primary
    if (primaryLower.includes(` ${queryLower}`) || primaryLower.includes(`${queryLower} `)) return 75;
    // General contains match on primary
    if (primaryLower.includes(queryLower)) return 60;
    // Exact match on secondary
    if (secondaryLower === queryLower) return 55;
    // Secondary contains match
    if (secondaryLower.includes(queryLower)) return 40;

    return 30;
  }
}
