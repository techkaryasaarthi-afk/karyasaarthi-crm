import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { NotificationType, InvoiceStatus, ConversationStatus } from '@prisma/client';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Rule 1: 15-Minute Omnichannel SLA Auto-Escalation
   * Finds open/pending conversations whose 15-min SLA deadline has passed without a staff reply.
   */
  async escalateSlaBreaches() {
    const now = new Date();
    const breachedConversations = await this.prisma.conversation.findMany({
      where: {
        firstRespondedAt: null,
        slaDueAt: { lt: now },
        status: { in: [ConversationStatus.OPEN, ConversationStatus.PENDING] },
      },
      include: {
        person: { select: { id: true, fullName: true, email: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
      },
    });

    const escalatedIds: string[] = [];

    // Find fallback admin staff to notify if no staff is assigned
    const adminStaff = await this.prisma.staff.findFirst({
      where: { role: 'ADMIN', active: true },
    });

    for (const conv of breachedConversations) {
      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: { status: ConversationStatus.ESCALATED },
      });

      const recipientId = conv.assignedStaffId || adminStaff?.id;
      if (recipientId) {
        await this.notificationsService.send({
          recipientId,
          type: NotificationType.SLA_BREACH,
          title: '🚨 SLA Breach: 15-Minute First Response Missed',
          message: `Conversation with ${conv.person.fullName} has exceeded the 15-minute SLA deadline. Escalated for immediate attention.`,
          link: `/inbox?id=${conv.id}`,
          metadata: {
            conversationId: conv.id,
            personId: conv.personId,
            slaDueAt: conv.slaDueAt,
          },
        });
      }

      await this.auditService.log({
        actorId: 'SYSTEM_AUTOMATION',
        action: 'SLA_AUTO_ESCALATED',
        entity: 'Conversation',
        entityId: conv.id,
        diff: {
          previousStatus: conv.status,
          newStatus: ConversationStatus.ESCALATED,
          breachedByMinutes: Math.round(
            (now.getTime() - (conv.slaDueAt?.getTime() || now.getTime())) / (1000 * 60),
          ),
        },
      });

      escalatedIds.push(conv.id);
    }

    this.logger.log(`SLA Escalation Engine: Processed ${escalatedIds.length} breached conversation(s)`);
    return { count: escalatedIds.length, escalatedIds };
  }

  /**
   * Rule 2: Stale Lead Auto-Reminder
   * Identifies leads sitting in NEW or CONTACTED with no active follow-up tasks.
   */
  async checkStaleLeads(staleHours = 48) {
    const thresholdDate = new Date(Date.now() - staleHours * 60 * 60 * 1000);

    const staleLeads = await this.prisma.lead.findMany({
      where: {
        stage: { in: ['NEW', 'CONTACTED'] },
        updatedAt: { lt: thresholdDate },
        tasks: {
          none: { completed: false },
        },
      },
      include: {
        person: { select: { id: true, fullName: true } },
        assignedStaff: { select: { id: true, name: true } },
      },
    });

    const remindedLeadIds: string[] = [];

    for (const lead of staleLeads) {
      // Auto-create reminder task
      await this.prisma.leadTask.create({
        data: {
          leadId: lead.id,
          assignedStaffId: lead.assignedStaffId,
          title: `Automated Follow-up: Prospect inactive for ${staleHours}h`,
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
        },
      });

      if (lead.assignedStaffId) {
        await this.notificationsService.send({
          recipientId: lead.assignedStaffId,
          type: NotificationType.LEAD_ASSIGNED,
          title: '⏰ Stale Lead Follow-up Reminder',
          message: `Lead "${lead.title}" for ${lead.person.fullName} has had no activity for over ${staleHours} hours. A follow-up task has been scheduled.`,
          link: `/leads/${lead.id}`,
          metadata: { leadId: lead.id },
        });
      }

      await this.auditService.log({
        actorId: 'SYSTEM_AUTOMATION',
        action: 'STALE_LEAD_TASK_CREATED',
        entity: 'Lead',
        entityId: lead.id,
        diff: { staleHours },
      });

      remindedLeadIds.push(lead.id);
    }

    this.logger.log(`Stale Lead Engine: Created follow-up tasks for ${remindedLeadIds.length} lead(s)`);
    return { count: remindedLeadIds.length, remindedLeadIds };
  }

  /**
   * Rule 3: Overdue Invoice Auto-Detection
   * Marks unpaid invoices whose due date has passed as OVERDUE and dispatches notifications.
   */
  async checkOverdueInvoices() {
    const now = new Date();
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PENDING,
        dueDate: { lt: now },
      },
      include: {
        client: { select: { id: true, fullName: true, email: true } },
      },
    });

    const overdueIds: string[] = [];

    for (const inv of overdueInvoices) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: { status: InvoiceStatus.OVERDUE },
      });

      await this.auditService.log({
        actorId: 'SYSTEM_AUTOMATION',
        action: 'INVOICE_MARKED_OVERDUE',
        entity: 'Invoice',
        entityId: inv.id,
        diff: {
          previousStatus: InvoiceStatus.PENDING,
          newStatus: InvoiceStatus.OVERDUE,
          totalAmount: inv.totalAmount,
        },
      });

      overdueIds.push(inv.id);
    }

    this.logger.log(`Invoice Monitor Engine: Marked ${overdueIds.length} invoice(s) as OVERDUE`);
    return { count: overdueIds.length, overdueIds };
  }

  /**
   * Rule 4: Data Retention & Privacy Compliance Engine (Blueprint Section 5)
   * Enforces retention periods:
   * 1. Purges applicant CV assets older than applicantRetentionDays (default 180 days).
   */
  async runDataRetentionPolicy(options?: { applicantRetentionDays?: number }) {
    const applicantDays = options?.applicantRetentionDays || 180;
    const applicantThreshold = new Date(Date.now() - applicantDays * 24 * 60 * 60 * 1000);

    const expiredApps = await this.prisma.application.findMany({
      where: {
        appliedAt: { lt: applicantThreshold },
        resumeUrl: { not: null },
      },
      select: { id: true, personId: true },
    });

    if (expiredApps.length > 0) {
      await this.prisma.application.updateMany({
        where: { id: { in: expiredApps.map((a) => a.id) } },
        data: {
          resumeUrl: null,
          portfolioUrl: null,
          interviewNotes: '[PURGED PER RETENTION POLICY]',
        },
      });

      await this.auditService.log({
        actorId: 'SYSTEM_DATA_RETENTION',
        action: 'APPLICANT_DATA_RETENTION_APPLIED',
        entity: 'Application',
        entityId: `${expiredApps.length}_records`,
        diff: { expiredCount: expiredApps.length, applicantDays },
      });
    }

    this.logger.log(`Data Retention Engine: Purged CV assets for ${expiredApps.length} application(s) older than ${applicantDays} days`);

    return {
      expiredApplicationsPurged: expiredApps.length,
      applicantRetentionDays: applicantDays,
      executedAt: new Date(),
    };
  }

  /**
   * Master execution cycle running all automated rules.
   */
  async runAllAutomations() {
    this.logger.log('Executing automated CRM maintenance cycle...');

    const [slaResult, leadsResult, invoiceResult, retentionResult] = await Promise.all([
      this.escalateSlaBreaches(),
      this.checkStaleLeads(48),
      this.checkOverdueInvoices(),
      this.runDataRetentionPolicy({ applicantRetentionDays: 180 }),
    ]);

    // Record / Update AutomationRule lastRunAt
    try {
      await this.prisma.automationRule.upsert({
        where: { id: 'cron-master-cycle' },
        update: { lastRunAt: new Date() },
        create: {
          id: 'cron-master-cycle',
          name: 'Master Automation Cycle',
          triggerType: 'ALL',
          description: 'Runs SLA auto-escalation, stale lead reminders, invoice overdue monitoring, and data retention.',
          lastRunAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not update automation rule log: ${err.message}`);
    }

    return {
      success: true,
      executedAt: new Date(),
      metrics: {
        slaEscalatedCount: slaResult.count,
        staleLeadsRemindedCount: leadsResult.count,
        overdueInvoicesCount: invoiceResult.count,
        expiredApplicationsPurged: retentionResult.expiredApplicationsPurged,
      },
    };
  }
}
