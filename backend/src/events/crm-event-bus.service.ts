import { Injectable, Logger } from '@nestjs/common';
import { CommsService } from '../modules/notifications/comms.service';
import {
  CrmEventType,
  LeadAssignedEvent,
  SlaBreachEvent,
  PaymentReceivedEvent,
  ApplicationReceivedEvent,
  MilestoneCompletedEvent,
  RevisionRequestedEvent,
} from './crm-events';

@Injectable()
export class CrmEventBusService {
  private readonly logger = new Logger(CrmEventBusService.name);

  constructor(private readonly commsService: CommsService) {}

  /**
   * Event 1: Lead Assigned -> Dispatches Email & Push notification to staff.
   */
  async handleLeadAssigned(event: LeadAssignedEvent) {
    this.logger.log(`[EVENT: ${CrmEventType.LEAD_ASSIGNED}] Notifying staff '${event.staffName}' for lead '${event.leadTitle}'`);

    const promises = [];

    // 1. Email to staff
    if (event.staffEmail) {
      promises.push(
        this.commsService.sendEmail({
          to: event.staffEmail,
          subject: `[Karya Saarthi] New Lead Assigned: ${event.leadTitle}`,
          content: `<p>Hello <b>${event.staffName}</b>,</p><p>A new lead <b>${event.leadTitle}</b> for prospect <b>${event.personName}</b> has been assigned to you.</p><p><a href="/leads/${event.leadId}">View Lead in Console</a></p>`,
          template: 'LEAD_ASSIGNED_STAFF',
          metadata: { leadId: event.leadId, staffId: event.staffId },
        }),
      );
    }

    // 2. Push Notification
    promises.push(
      this.commsService.sendPush({
        recipientId: event.staffId,
        title: 'New Lead Assigned',
        body: `Lead "${event.leadTitle}" from ${event.personName} has been assigned to you.`,
        deepLink: `/leads/${event.leadId}`,
      }),
    );

    return Promise.all(promises);
  }

  /**
   * Event 2: SLA Breach -> Dispatches urgent Push & WhatsApp alert to manager.
   */
  async handleSlaBreached(event: SlaBreachEvent) {
    this.logger.log(`[EVENT: ${CrmEventType.SLA_BREACH}] SLA Breach on conversation ${event.conversationId}`);

    const promises = [];

    // Push notification to staff
    if (event.assignedStaffId) {
      promises.push(
        this.commsService.sendPush({
          recipientId: event.assignedStaffId,
          title: '🚨 SLA Breach: 15-Minute Response Missed',
          body: `Inquiry from ${event.personName} has breached the SLA deadline by ${event.breachMinutes} minutes.`,
          deepLink: `/inbox?id=${event.conversationId}`,
        }),
      );
    }

    // WhatsApp / Emergency channel alert
    promises.push(
      this.commsService.sendWhatsApp({
        toPhone: '+919876500000', // Escalation helpline / manager number
        message: `🚨 SLA Escalation: Customer ${event.personName} is awaiting a response for over 15 minutes. Link: /inbox?id=${event.conversationId}`,
        template: 'SLA_ESCALATION_ALERT',
        metadata: { conversationId: event.conversationId },
      }),
    );

    return Promise.all(promises);
  }

  /**
   * Event 3: Payment Received -> Branded invoice receipt via Email & WhatsApp to client.
   */
  async handlePaymentReceived(event: PaymentReceivedEvent) {
    this.logger.log(`[EVENT: ${CrmEventType.PAYMENT_RECEIVED}] Invoice ${event.invoiceNumber} paid by ${event.clientName}`);

    const promises = [];

    if (event.clientEmail) {
      promises.push(
        this.commsService.sendEmail({
          to: event.clientEmail,
          recipientPersonId: event.clientId,
          subject: `Payment Receipt: ${event.invoiceNumber} — ₹${event.amount.toLocaleString('en-IN')}`,
          content: `<p>Dear <b>${event.clientName}</b>,</p><p>We have successfully received your payment of <b>₹${event.amount.toLocaleString('en-IN')} ${event.currency}</b> for Invoice <b>${event.invoiceNumber}</b>.</p><p>Thank you for partnering with Karya Saarthi.</p>`,
          template: 'PAYMENT_RECEIPT',
          metadata: { invoiceId: event.invoiceId, invoiceNumber: event.invoiceNumber, amount: event.amount },
        }),
      );
    }

    if (event.clientPhone) {
      promises.push(
        this.commsService.sendWhatsApp({
          toPhone: event.clientPhone,
          recipientPersonId: event.clientId,
          message: `Hello ${event.clientName}, your payment of ₹${event.amount.toLocaleString('en-IN')} for Invoice ${event.invoiceNumber} has been received. Thank you! - Team Karya Saarthi`,
          template: 'PAYMENT_CONFIRMATION_WA',
          metadata: { invoiceNumber: event.invoiceNumber },
        }),
      );
    }

    return Promise.all(promises);
  }

  /**
   * Event 4: Job Application Received -> Candidate auto-reply confirmation email (Blueprint 3.5).
   */
  async handleApplicationReceived(event: ApplicationReceivedEvent) {
    this.logger.log(`[EVENT: ${CrmEventType.APPLICATION_RECEIVED}] Application received from ${event.personName} for ${event.roleTitle}`);

    return this.commsService.sendEmail({
      to: event.personEmail,
      recipientPersonId: event.personId,
      subject: `Application Received: ${event.roleTitle} at Karya Saarthi`,
      content: `<p>Hi <b>${event.personName}</b>,</p><p>Thank you for applying for the <b>${event.roleTitle}</b> role at Karya Saarthi. Our technical recruitment team is reviewing your profile and will get back to you shortly.</p><p>Best regards,<br/>Karya Saarthi Talent Team</p>`,
      template: 'APPLICATION_CONFIRMATION',
      metadata: { applicationId: event.applicationId, roleTitle: event.roleTitle },
    });
  }

  /**
   * Event 5: Milestone Completed -> In-app push notification & email to client.
   */
  async handleMilestoneCompleted(event: MilestoneCompletedEvent) {
    this.logger.log(`[EVENT: ${CrmEventType.MILESTONE_COMPLETED}] Milestone '${event.milestoneTitle}' completed on project '${event.projectTitle}'`);

    const promises = [];

    // Push to client
    promises.push(
      this.commsService.sendPush({
        recipientId: event.clientId,
        title: 'Project Milestone Completed',
        body: `Milestone "${event.milestoneTitle}" for "${event.projectTitle}" has been completed and is ready for review!`,
        deepLink: `/projects/${event.projectId}`,
      }),
    );

    // Email to client
    if (event.clientEmail) {
      promises.push(
        this.commsService.sendEmail({
          to: event.clientEmail,
          recipientPersonId: event.clientId,
          subject: `Milestone Completed: ${event.projectTitle} — ${event.milestoneTitle}`,
          content: `<p>Dear <b>${event.clientName}</b>,</p><p>We are pleased to inform you that milestone <b>${event.milestoneTitle}</b> for project <b>${event.projectTitle}</b> has been completed.</p>`,
          template: 'MILESTONE_COMPLETED',
          metadata: { projectId: event.projectId },
        }),
      );
    }

    return Promise.all(promises);
  }

  /**
   * Event 6: Revision Requested -> Alerts assigned vendor.
   */
  async handleRevisionRequested(event: RevisionRequestedEvent) {
    this.logger.log(`[EVENT: ${CrmEventType.REVISION_REQUESTED}] Revision on project '${event.projectTitle}'`);

    return this.commsService.sendPush({
      recipientId: event.vendorId,
      title: 'Revision Requested on Deliverable',
      body: `Client requested changes for "${event.deliverableTitle}" on ${event.projectTitle}. Instructions: "${event.instructions.slice(0, 50)}..."`,
      deepLink: `/projects/${event.projectId}`,
    });
  }
}
