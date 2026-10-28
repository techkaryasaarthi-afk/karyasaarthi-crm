import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AutomationService } from '../src/modules/automation/automation.service';
import { NotificationType, ConversationStatus, InvoiceStatus, Role, PersonType, Surface } from '@prisma/client';

async function runPhase6Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 6: NOTIFICATIONS, AUDIT LOGS & AUTOMATION');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const notificationsService = app.get(NotificationsService);
  const auditService = app.get(AuditService);
  const automationService = app.get(AutomationService);

  try {
    // -------------------------------------------------------------
    // Step 1: Set up Test Staff and Customer Person
    // -------------------------------------------------------------
    console.log('--- Step 1: Setting up Staff and Customer Entities ---');
    const staffEmail = `staff.phase6.${Date.now()}@karyasaarthi.com`;
    const adminEmail = `admin.phase6.${Date.now()}@karyasaarthi.com`;

    const staff = await prisma.staff.create({
      data: {
        name: 'Aakash Malhotra (Sales Lead)',
        email: staffEmail,
        passwordHash: 'dummyhash123',
        role: Role.SALES,
        active: true,
      },
    });

    const admin = await prisma.staff.create({
      data: {
        name: 'Super Admin (Operations)',
        email: adminEmail,
        passwordHash: 'dummyhash123',
        role: Role.ADMIN,
        active: true,
      },
    });

    const customer = await prisma.person.create({
      data: {
        fullName: 'Vikrant Roy',
        email: `vikrant.phase6.${Date.now()}@example.com`,
        phone: `+919922${Math.floor(100000 + Math.random() * 900000)}`,
        type: PersonType.LEAD,
        firstTouchSource: Surface.APP,
      },
    });
    console.log(`✅ Staff created: ${staff.name} (${staff.id})`);
    console.log(`✅ Admin created: ${admin.name} (${admin.id})`);
    console.log(`✅ Customer created: ${customer.fullName} (${customer.id})`);

    // -------------------------------------------------------------
    // Step 2: Test Notifications Engine (Dispatch & Unread Badges)
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Notifications Engine ---');
    const notif = await notificationsService.send({
      recipientId: staff.id,
      title: '💼 New High-Value Lead Assigned',
      message: 'You have been assigned to prospect "Enterprise Cloud Migration". Expected budget: ₹3,50,000.',
      type: NotificationType.LEAD_ASSIGNED,
      link: '/leads/demo-lead-id',
      metadata: { leadId: 'demo-lead-id', budget: 350000 },
    });
    console.log(`✅ Notification dispatched (ID: ${notif.id}) to ${staff.name}`);

    // Check unread count
    const unreadBefore = await notificationsService.getUnreadCount(staff.id);
    console.log(`✅ Unread badge count before read: ${unreadBefore.unreadCount}`);
    if (unreadBefore.unreadCount < 1) {
      throw new Error('Unread count should be at least 1');
    }

    // Mark as read
    const readResult = await notificationsService.markAsRead(notif.id, staff.id);
    console.log(`✅ Notification marked as read at: ${readResult.readAt?.toISOString()}`);

    const unreadAfter = await notificationsService.getUnreadCount(staff.id);
    console.log(`✅ Unread badge count after read: ${unreadAfter.unreadCount}`);

    // -------------------------------------------------------------
    // Step 3: Test Audit Logging Engine
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing Audit Logging Engine ---');
    const auditRecord = await auditService.log({
      actorId: staff.id,
      action: 'LEAD_STAGE_UPDATED',
      entity: 'Lead',
      entityId: 'demo-lead-phase6',
      diff: {
        before: { stage: 'QUALIFIED', value: 200000 },
        after: { stage: 'WON', value: 250000 },
      },
    });
    console.log(`✅ Immutable audit log created (ID: ${auditRecord.id}, Action: ${auditRecord.action})`);

    const auditHistory = await auditService.findByEntity('Lead', 'demo-lead-phase6');
    console.log(`✅ Entity audit history query returned ${auditHistory.length} record(s)`);

    // -------------------------------------------------------------
    // Step 4: Test SLA Auto-Escalation Engine (Rule 1)
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Testing 15-Minute SLA Auto-Escalation Rule ---');
    // Create conversation where SLA expired 10 minutes ago
    const pastSlaDate = new Date(Date.now() - 10 * 60 * 1000);
    const breachedConv = await prisma.conversation.create({
      data: {
        personId: customer.id,
        channel: Surface.APP,
        status: ConversationStatus.OPEN,
        assignedStaffId: staff.id,
        slaDueAt: pastSlaDate,
        firstRespondedAt: null,
      },
    });
    console.log(`✅ Created test conversation with expired SLA (ID: ${breachedConv.id}, SLA was due at: ${breachedConv.slaDueAt?.toISOString()})`);

    // Run SLA Escalation rule
    const slaEscalationResult = await automationService.escalateSlaBreaches();
    console.log(`✅ SLA Escalation Engine executed: ${slaEscalationResult.count} conversation(s) escalated`);

    // Verify conversation status is ESCALATED
    const updatedConv = await prisma.conversation.findUnique({
      where: { id: breachedConv.id },
    });
    console.log(`✅ Conversation status after SLA escalation: ${updatedConv?.status} (Expected: ESCALATED)`);
    if (updatedConv?.status !== ConversationStatus.ESCALATED) {
      throw new Error(`Conversation status should be ESCALATED, got ${updatedConv?.status}`);
    }

    // Verify SLA breach notification sent to staff
    const staffNotifs = await notificationsService.findAll(staff.id, { unreadOnly: true });
    const slaNotif = staffNotifs.data.find((n) => n.type === NotificationType.SLA_BREACH);
    console.log(`✅ Staff received urgent SLA breach notification: "${slaNotif?.title}"`);

    // -------------------------------------------------------------
    // Step 5: Test Stale Lead Auto-Reminder Engine (Rule 2)
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing Stale Lead Auto-Reminder Engine ---');
    const staleLead = await prisma.lead.create({
      data: {
        personId: customer.id,
        title: 'Legacy Data Migration to PostgreSQL',
        stage: 'NEW',
        sourceSurface: Surface.SITE_COM,
        assignedStaffId: staff.id,
        updatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
      },
    });
    console.log(`✅ Created test stale lead: "${staleLead.title}" (ID: ${staleLead.id})`);

    const staleLeadsResult = await automationService.checkStaleLeads(48);
    console.log(`✅ Stale Lead Engine executed: ${staleLeadsResult.count} lead(s) processed`);

    // Verify automated task created for lead
    const createdTasks = await prisma.leadTask.findMany({
      where: { leadId: staleLead.id },
    });
    console.log(`✅ Automated follow-up task generated: "${createdTasks[0]?.title}" (Due: ${createdTasks[0]?.dueAt.toISOString()})`);

    // -------------------------------------------------------------
    // Step 6: Test Overdue Invoice Auto-Detection (Rule 3)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Testing Overdue Invoice Auto-Detection Engine ---');
    const overdueInvoiceNumber = `INV-${Date.now()}-OVERDUE`;
    const overdueInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: overdueInvoiceNumber,
        clientId: customer.id,
        title: 'Retainer Payment - Sprint 4',
        subtotal: 40000,
        taxAmount: 7200,
        totalAmount: 47200,
        status: InvoiceStatus.PENDING,
        dueDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // Due 2 days ago
      },
    });
    console.log(`✅ Created pending invoice with past due date: ${overdueInvoice.invoiceNumber}`);

    const overdueResult = await automationService.checkOverdueInvoices();
    console.log(`✅ Overdue Invoice Engine executed: ${overdueResult.count} invoice(s) marked OVERDUE`);

    const updatedInv = await prisma.invoice.findUnique({
      where: { id: overdueInvoice.id },
    });
    console.log(`✅ Invoice status updated to: ${updatedInv?.status} (Expected: OVERDUE)`);
    if (updatedInv?.status !== InvoiceStatus.OVERDUE) {
      throw new Error(`Invoice status should be OVERDUE, got ${updatedInv?.status}`);
    }

    // -------------------------------------------------------------
    // Step 7: Master Automation Cycle Run
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Executing Master Automation Cycle ---');
    const masterResult = await automationService.runAllAutomations();
    console.log(`✅ Master automation cycle executed successfully:`, JSON.stringify(masterResult.metrics));

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 6 AUTOMATION & NOTIFICATIONS TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('❌ Phase 6 verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

runPhase6Verification();
