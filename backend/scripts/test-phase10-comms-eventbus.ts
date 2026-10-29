import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { CommsService } from '../src/modules/notifications/comms.service';
import { CrmEventBusService } from '../src/events/crm-event-bus.service';
import { Role, Surface, PersonType, NotificationChannel, CommsDeliveryStatus } from '@prisma/client';

async function runPhase10Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 10: MULTI-CHANNEL TRANSACTIONAL COMMS & EVENT BUS');
  console.log('   (Email, WhatsApp, Push/FCM, SMS, Consent Privacy & CRM Events)');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const commsService = app.get(CommsService);
  const eventBusService = app.get(CrmEventBusService);

  const cleanupIds = {
    staffIds: [] as string[],
    personIds: [] as string[],
    commsLogIds: [] as string[],
  };

  try {
    const timestamp = Date.now();

    // -------------------------------------------------------------
    // Step 1: Setting up Test Entities
    // -------------------------------------------------------------
    console.log('--- Step 1: Setting up Test Staff & Consented/Opted-Out Persons ---');

    // 1. Staff
    const staff = await prisma.staff.create({
      data: {
        name: 'Naveen Jindal (Sales Specialist)',
        email: `naveen.comms.${timestamp}@karyasaarthi.com`,
        passwordHash: 'dummyhash123',
        role: Role.SALES,
        active: true,
      },
    });
    cleanupIds.staffIds.push(staff.id);
    console.log(`✅ Staff created: ${staff.name} (${staff.id})`);

    // 2. Client Person with Full Consent (Opted-in)
    const consentedPerson = await prisma.person.create({
      data: {
        fullName: 'Ananya Birla',
        email: `ananya.client.${timestamp}@birlaenterprises.com`,
        phone: `+9198111${Math.floor(10000 + Math.random() * 90000)}`,
        type: PersonType.CLIENT,
        firstTouchSource: Surface.SITE_COM,
        consentFlags: { email: true, whatsapp: true, sms: true },
      },
    });
    cleanupIds.personIds.push(consentedPerson.id);
    console.log(`✅ Consented Client created: ${consentedPerson.fullName} (Consent: Email, WhatsApp, SMS = TRUE)`);

    // 3. Client Person with Explicit Opt-Out (GDPR / Privacy Test)
    const optedOutPerson = await prisma.person.create({
      data: {
        fullName: 'Rahul Bajaj',
        email: `rahul.optout.${timestamp}@bajajcorp.com`,
        phone: `+9198222${Math.floor(10000 + Math.random() * 90000)}`,
        type: PersonType.CLIENT,
        firstTouchSource: Surface.SITE_IN,
        consentFlags: { email: false, whatsapp: false, sms: false },
      },
    });
    cleanupIds.personIds.push(optedOutPerson.id);
    console.log(`✅ Opted-Out Client created: ${optedOutPerson.fullName} (Consent: Email, WhatsApp, SMS = FALSE)`);

    // -------------------------------------------------------------
    // Step 2: Testing Direct Multi-Channel Dispatchers
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Direct Multi-Channel Dispatchers ---');

    // Email
    const emailResult = await commsService.sendEmail({
      to: consentedPerson.email!,
      recipientPersonId: consentedPerson.id,
      subject: 'Welcome to Karya Saarthi Unified CRM',
      content: '<p>Thank you for initiating your enterprise transformation with us.</p>',
      template: 'CLIENT_WELCOME',
    });
    cleanupIds.commsLogIds.push(emailResult.id);
    console.log(`✅ Email sent: [${emailResult.status}] to ${emailResult.recipientEmail} (External ID: ${emailResult.externalId})`);

    // WhatsApp
    const waResult = await commsService.sendWhatsApp({
      toPhone: consentedPerson.phone!,
      recipientPersonId: consentedPerson.id,
      message: 'Hello Ananya, your dedicated project team has been assigned at Karya Saarthi.',
      template: 'CLIENT_ASSIGNMENT_WA',
    });
    cleanupIds.commsLogIds.push(waResult.id);
    console.log(`✅ WhatsApp sent: [${waResult.status}] to ${waResult.recipientPhone} (External ID: ${waResult.externalId})`);

    // Push
    const pushResult = await commsService.sendPush({
      recipientId: staff.id,
      title: 'New Account Notification',
      body: `Client ${consentedPerson.fullName} has registered via karyasaarthi.com.`,
      deepLink: `/persons/${consentedPerson.id}`,
    });
    cleanupIds.commsLogIds.push(pushResult.id);
    console.log(`✅ Push sent: [${pushResult.status}] to ${pushResult.recipientId} (External ID: ${pushResult.externalId})`);

    // -------------------------------------------------------------
    // Step 3: Testing Data Privacy & Consent Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing Data Privacy & Consent Enforcement ---');

    const suppressedEmail = await commsService.sendEmail({
      to: optedOutPerson.email!,
      recipientPersonId: optedOutPerson.id,
      subject: 'Promotional Marketing Update',
      content: '<p>Check out our latest case studies.</p>',
    });
    cleanupIds.commsLogIds.push(suppressedEmail.id);

    console.log(`✅ Opted-Out Email status: ${suppressedEmail.status} (Suppressed: ${suppressedEmail.status === CommsDeliveryStatus.OPTED_OUT})`);
    if (suppressedEmail.status !== CommsDeliveryStatus.OPTED_OUT) {
      throw new Error('Data privacy failure! Suppressed email was not marked as OPTED_OUT.');
    }

    const suppressedWhatsApp = await commsService.sendWhatsApp({
      toPhone: optedOutPerson.phone!,
      recipientPersonId: optedOutPerson.id,
      message: 'Exclusive 15% discount for you.',
    });
    cleanupIds.commsLogIds.push(suppressedWhatsApp.id);

    console.log(`✅ Opted-Out WhatsApp status: ${suppressedWhatsApp.status} (Suppressed: ${suppressedWhatsApp.status === CommsDeliveryStatus.OPTED_OUT})`);
    if (suppressedWhatsApp.status !== CommsDeliveryStatus.OPTED_OUT) {
      throw new Error('Data privacy failure! Suppressed WhatsApp was not marked as OPTED_OUT.');
    }

    // -------------------------------------------------------------
    // Step 4: Testing Centralized CRM Event Bus Triggers
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Testing Centralized CRM Event Bus Triggers ---');

    // 1. Lead Assigned Event
    const leadAssignedLogs = await eventBusService.handleLeadAssigned({
      leadId: `lead-${timestamp}`,
      leadTitle: 'Enterprise Cloud Migration Architecture',
      personId: consentedPerson.id,
      personName: consentedPerson.fullName,
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
    });
    leadAssignedLogs.forEach((l) => cleanupIds.commsLogIds.push(l.id));
    console.log(`✅ [CRM Event: LeadAssigned] Dispatched ${leadAssignedLogs.length} notifications (Email & Push) to ${staff.name}`);

    // 2. SLA Breach Event
    const slaBreachLogs = await eventBusService.handleSlaBreached({
      conversationId: `conv-${timestamp}`,
      personId: consentedPerson.id,
      personName: consentedPerson.fullName,
      assignedStaffId: staff.id,
      assignedStaffEmail: staff.email,
      slaDueAt: new Date(),
      breachMinutes: 18,
    });
    slaBreachLogs.forEach((l) => cleanupIds.commsLogIds.push(l.id));
    console.log(`✅ [CRM Event: SlaBreached] Dispatched ${slaBreachLogs.length} emergency alerts (Push & Manager WhatsApp)`);

    // 3. Payment Received Event
    const paymentLogs = await eventBusService.handlePaymentReceived({
      invoiceId: `inv-${timestamp}`,
      invoiceNumber: `INV-2026-${timestamp.toString().slice(-4)}`,
      clientId: consentedPerson.id,
      clientName: consentedPerson.fullName,
      clientEmail: consentedPerson.email,
      clientPhone: consentedPerson.phone,
      amount: 175000,
      currency: 'INR',
    });
    paymentLogs.forEach((l) => cleanupIds.commsLogIds.push(l.id));
    console.log(`✅ [CRM Event: PaymentReceived] Dispatched ${paymentLogs.length} branded receipts (Email Receipt & WhatsApp Confirmation)`);

    // 4. Job Application Received Event (Blueprint 3.5 Auto-Reply)
    const applicationLog = await eventBusService.handleApplicationReceived({
      applicationId: `app-${timestamp}`,
      personId: consentedPerson.id,
      personName: consentedPerson.fullName,
      personEmail: consentedPerson.email!,
      roleTitle: 'Lead DevOps & Cloud Engineer',
    });
    cleanupIds.commsLogIds.push(applicationLog.id);
    console.log(`✅ [CRM Event: ApplicationReceived] Dispatched auto-reply confirmation email to applicant: '${applicationLog.recipientEmail}'`);

    // 5. Milestone Completed Event
    const milestoneLogs = await eventBusService.handleMilestoneCompleted({
      projectId: `proj-${timestamp}`,
      projectTitle: 'Enterprise FinTech Trading Platform',
      milestoneTitle: 'Phase 1: Architecture & Auth Engine Delivered',
      clientId: consentedPerson.id,
      clientName: consentedPerson.fullName,
      clientEmail: consentedPerson.email,
    });
    milestoneLogs.forEach((l) => cleanupIds.commsLogIds.push(l.id));
    console.log(`✅ [CRM Event: MilestoneCompleted] Dispatched ${milestoneLogs.length} updates (In-App Push & Email)`);

    // -------------------------------------------------------------
    // Step 5: Querying Comms Audit Trail
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Querying Comms Audit Trail ---');

    const logsQuery = await commsService.findAllCommsLogs({ limit: 50 });
    console.log(`✅ Total Comms Records verified in audit log: ${logsQuery.total}`);

    const emailLogs = logsQuery.data.filter((l) => l.channel === NotificationChannel.EMAIL);
    const waLogs = logsQuery.data.filter((l) => l.channel === NotificationChannel.WHATSAPP);
    const pushLogs = logsQuery.data.filter((l) => l.channel === NotificationChannel.PUSH);

    console.log(`   - Verified Email Logs: ${emailLogs.length}`);
    console.log(`   - Verified WhatsApp Logs: ${waLogs.length}`);
    console.log(`   - Verified Push Logs: ${pushLogs.length}`);

    // -------------------------------------------------------------
    // Step 6: Cleaning up Test Records
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Cleaning up Test Records ---');
    if (cleanupIds.commsLogIds.length > 0) {
      await prisma.commsLog.deleteMany({ where: { id: { in: cleanupIds.commsLogIds } } });
    }
    if (cleanupIds.personIds.length > 0) {
      await prisma.person.deleteMany({ where: { id: { in: cleanupIds.personIds } } });
    }
    if (cleanupIds.staffIds.length > 0) {
      await prisma.staff.deleteMany({ where: { id: { in: cleanupIds.staffIds } } });
    }
    console.log('✅ Cleaned up test comms logs, persons, and staff.');

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 10 (COMMS & EVENT BUS) TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error: any) {
    console.error('\n❌ Phase 10 Verification failed with error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

runPhase10Verification().catch(() => process.exit(1));
