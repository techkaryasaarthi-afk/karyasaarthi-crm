import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics.dto';
import { LeadStage, InvoiceStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveDashboardOverview(query?: AnalyticsQueryDto) {
    const days = Number(query?.days) || 30;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      invoices,
      payments,
      leads,
      projects,
      milestones,
      conversations,
      vendors,
      jobs,
      applications,
      ambassadors,
      interactions,
    ] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { totalAmount: true, status: true },
      }),
      this.prisma.payment.findMany({
        where: { capturedAt: { gte: sinceDate }, status: 'SUCCESS' },
        select: { amount: true },
      }),
      this.prisma.lead.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { stage: true, estimatedValue: true },
      }),
      this.prisma.project.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { status: true, stage: true, budget: true },
      }),
      this.prisma.projectMilestone.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { status: true },
      }),
      this.prisma.conversation.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { status: true, createdAt: true, firstRespondedAt: true },
      }),
      this.prisma.vendorProfile.findMany({
        select: {
          maxCapacity: true,
          person: {
            select: {
              vendorProjects: {
                where: { status: 'ACTIVE' },
                select: { id: true },
              },
            },
          },
        },
      }),
      this.prisma.jobPosting.findMany({
        select: { open: true },
      }),
      this.prisma.application.findMany({
        where: { appliedAt: { gte: sinceDate } },
        select: { stage: true, aiMatchScore: true },
      }),
      this.prisma.campusAmbassador.findMany({
        select: { totalReferrals: true, successfulConversions: true, commissionEarned: true },
      }),
      this.prisma.interaction.groupBy({
        by: ['channel'],
        _count: { channel: true },
      }),
    ]);

    // 1. Revenue & Invoicing KPIs
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const pendingReceivables = totalInvoiced - totalCollected;
    const paidInvoicesCount = invoices.filter((inv) => inv.status === InvoiceStatus.PAID).length;

    // 2. Sales Pipeline & Funnel
    const totalLeads = leads.length;
    const leadsByStage: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL_SENT: 0,
      WON: 0,
      LOST: 0,
    };
    let wonCount = 0;
    let estimatedPipelineValue = 0;

    for (const lead of leads) {
      if (leadsByStage[lead.stage] !== undefined) {
        leadsByStage[lead.stage]++;
      }
      if (lead.stage === LeadStage.WON) {
        wonCount++;
      }
      if (lead.stage !== LeadStage.LOST && lead.estimatedValue) {
        estimatedPipelineValue += lead.estimatedValue;
      }
    }
    const winRatePercent = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

    // 3. Project Delivery Metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
    const deliveredProjects = projects.filter(
      (p) => p.status === 'DELIVERED' || p.stage === ('DELIVERED' as any),
    ).length;

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(
      (m) => m.status === ('COMPLETED' as any),
    ).length;
    const milestoneCompletionRate =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    // 4. Omnichannel SLA Metrics
    const totalConversations = conversations.length;
    const respondedConversations = conversations
      .filter((c) => c.firstRespondedAt !== null)
      .map((c) => ({
        ...c,
        responseTimeMinutes: Math.max(
          0,
          Math.round(
            (c.firstRespondedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60),
          ),
        ),
      }));

    const avgResponseTimeMinutes =
      respondedConversations.length > 0
        ? Math.round(
            respondedConversations.reduce(
              (sum, c) => sum + c.responseTimeMinutes,
              0,
            ) / respondedConversations.length,
          )
        : 0;

    const slaCompliantCount = respondedConversations.filter(
      (c) => c.responseTimeMinutes <= 15,
    ).length;

    const slaComplianceRate =
      respondedConversations.length > 0
        ? Math.round((slaCompliantCount / respondedConversations.length) * 100)
        : 100;

    // 5. Vendor Network Workload
    let totalVendorCapacity = 0;
    let totalVendorAllocated = 0;
    for (const v of vendors) {
      totalVendorCapacity += v.maxCapacity;
      totalVendorAllocated += v.person.vendorProjects.length;
    }
    const vendorUtilizationPercent =
      totalVendorCapacity > 0
        ? Math.round((totalVendorAllocated / totalVendorCapacity) * 100)
        : 0;

    // 6. Recruitment ATS
    const openJobs = jobs.filter((j) => j.open).length;
    const hiresCount = applications.filter((a) => a.stage === 'OFFER').length;
    const avgCandidateMatchScore =
      applications.length > 0
        ? Math.round(
            applications.reduce((sum, a) => sum + (a.aiMatchScore || 0), 0) /
              applications.length,
          )
        : 0;

    // 7. Campus Ambassador Network
    const totalAmbassadors = ambassadors.length;
    const totalReferrals = ambassadors.reduce((sum, a) => sum + a.totalReferrals, 0);
    const totalConversions = ambassadors.reduce(
      (sum, a) => sum + a.successfulConversions,
      0,
    );
    const totalCommissionEarned = ambassadors.reduce(
      (sum, a) => sum + a.commissionEarned,
      0,
    );

    // 8. Cross-Surface Traffic & Ingestion
    const surfaceDistribution: Record<string, number> = {};
    for (const item of interactions) {
      surfaceDistribution[item.channel] = item._count.channel;
    }

    return {
      timeframeDays: days,
      revenue: {
        totalInvoiced,
        totalCollected,
        pendingReceivables,
        paidInvoicesCount,
        collectionRatePercent:
          totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
      },
      salesPipeline: {
        totalLeads,
        estimatedPipelineValue,
        winRatePercent,
        funnel: leadsByStage,
      },
      projectDelivery: {
        totalProjects,
        activeProjects,
        deliveredProjects,
        milestonesTotal: totalMilestones,
        milestonesCompleted: completedMilestones,
        milestoneCompletionRate,
      },
      omnichannelSLA: {
        totalConversations,
        avgResponseTimeMinutes,
        slaComplianceRate,
        targetMinutes: 15,
      },
      vendorNetwork: {
        totalExperts: vendors.length,
        capacitySlots: totalVendorCapacity,
        activeAllocations: totalVendorAllocated,
        utilizationPercent: vendorUtilizationPercent,
      },
      recruitmentATS: {
        openJobs,
        totalApplications: applications.length,
        hiresCount,
        avgCandidateMatchScore,
      },
      campusAmbassadors: {
        totalAmbassadors,
        totalReferrals,
        totalConversions,
        totalCommissionEarned,
      },
      surfaceTraffic: surfaceDistribution,
    };
  }
}
