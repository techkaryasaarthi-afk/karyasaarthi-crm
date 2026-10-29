import { Surface, Role } from '@prisma/client';

export enum CrmEventType {
  LEAD_CREATED = 'crm.lead.created',
  LEAD_ASSIGNED = 'crm.lead.assigned',
  SLA_BREACH = 'crm.sla.breach',
  PAYMENT_RECEIVED = 'crm.payment.received',
  APPLICATION_RECEIVED = 'crm.application.received',
  MILESTONE_COMPLETED = 'crm.milestone.completed',
  REVISION_REQUESTED = 'crm.revision.requested',
}

export interface LeadCreatedEvent {
  leadId: string;
  personId: string;
  title: string;
  estimatedValue?: number | null;
  serviceType?: string | null;
  sourceSurface: Surface;
}

export interface LeadAssignedEvent {
  leadId: string;
  leadTitle: string;
  personId: string;
  personName: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
}

export interface SlaBreachEvent {
  conversationId: string;
  personId: string;
  personName: string;
  assignedStaffId?: string | null;
  assignedStaffEmail?: string | null;
  slaDueAt: Date;
  breachMinutes: number;
}

export interface PaymentReceivedEvent {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  amount: number;
  currency: string;
}

export interface ApplicationReceivedEvent {
  applicationId: string;
  personId: string;
  personName: string;
  personEmail: string;
  roleTitle: string;
}

export interface MilestoneCompletedEvent {
  projectId: string;
  projectTitle: string;
  milestoneTitle: string;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
}

export interface RevisionRequestedEvent {
  projectId: string;
  projectTitle: string;
  vendorId: string;
  deliverableTitle: string;
  instructions: string;
}
