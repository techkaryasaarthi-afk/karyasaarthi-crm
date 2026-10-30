import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PersonsService } from '../src/modules/persons/persons.service';
import { AutomationService } from '../src/modules/automation/automation.service';
import { AppService } from '../src/app.service';
import { Role, Surface, PersonType, ProjectStage, ProjectStatus, AppStage, NotificationChannel, CommsDeliveryStatus, InvoiceStatus } from '@prisma/client';

async function runPhase11Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 11: DATA PRIVACY, RETENTION & BACKUP DRILL');
  console.log('   (GDPR/DPDP Erasure, Portability, CV Retention & Backup Drill)');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const personsService = app.get(PersonsService);
  const automationService = app.get(AutomationService);
  const appService = app.get(AppService);

  const cleanupIds = {
    staffIds: [] as string[],
    personIds: [] as string[],
    jobPostingIds: [] as string[],
    applicationIds: [] as string[],
    leadIds: [] as string[],
    projectIds: [] as string[],
    invoiceIds: [] as string[],
    commsLogIds: [] as string[],
  };

  try {
    const timestamp = Date.now();

    // -------------------------------------------------------------
    // Step 1: Setting up Test Entities
    // -------------------------------------------------------------
    console.log('--- Step 1: Setting up Test Staff, Client & Candidate ---');

    const admin = await prisma.staff.create({
      data: {
        name: 'Kabir Oberoi (Privacy Officer)',
        email: `kabir.privacy.${timestamp}@karyasaarthi.com`,
        passwordHash: 'dummyhash123',
        role: Role.ADMIN,
        active: true,
      },
    });
    cleanupIds.staffIds.push(admin.id);
    console.log(`✅ Admin created: ${admin.name} (${admin.id})`);

    // Client Person with full data graph
    const client = await prisma.person.create({
      data: {
        fullName: 'Varun Alagh',
        email: `varun.client.${timestamp}@honasa.com`,
        phone: `+9198333${Math.floor(10000 + Math.random() * 90000)}`,
        type: PersonType.CLIENT,
        firstTouchSource: Surface.SITE_COM,
        consentFlags: { marketing: true, analytics: true },
      },
    });
    cleanupIds.personIds.push(client.id);
    console.log(`✅ Client created: ${client.fullName} (${client.id})`);

    // Create related lead, project, invoice, and comms log for client
    const lead = await prisma.lead.create({
      data: {
        personId: client.id,
        title: 'Brand Modernization & E-Commerce Web Engine',
        sourceSurface: Surface.SITE_COM,
      },
    });
    cleanupIds.leadIds.push(lead.id);

    const project = await prisma.project.create({
      data: {
        clientId: client.id,
        title: 'Enterprise D2C Platform',
        serviceType: 'Web Development',
        stage: ProjectStage.IN_PROGRESS,
        status: ProjectStatus.ACTIVE,
        sourceSurface: Surface.SITE_COM,
      },
    });
    cleanupIds.projectIds.push(project.id);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-PRIVACY-${timestamp.toString().slice(-5)}`,
        clientId: client.id,
        title: 'D2C Architecture Retainer',
        subtotal: 75000,
        totalAmount: 88500,
        status: InvoiceStatus.PAID,
      },
    });
    cleanupIds.invoiceIds.push(invoice.id);

    const commsLog = await prisma.commsLog.create({
      data: {
        recipientId: client.id,
        recipientEmail: client.email,
        channel: NotificationChannel.EMAIL,
        subject: 'Confidential Strategy Brief',
        content: 'Sensitive client project strategy content here.',
        status: CommsDeliveryStatus.DELIVERED,
      },
    });
    cleanupIds.commsLogIds.push(commsLog.id);

    // Candidate Person with 200-day-old job application
    const candidate = await prisma.person.create({
      data: {
        fullName: 'Tara Sutaria',
        email: `tara.applicant.${timestamp}@gmail.com`,
        phone: `+9198444${Math.floor(10000 + Math.random() * 90000)}`,
        type: PersonType.APPLICANT,
        firstTouchSource: Surface.CAREER,
      },
    });
    cleanupIds.personIds.push(candidate.id);

    const job = await prisma.jobPosting.create({
      data: {
        title: 'Senior Frontend Architect',
        department: 'Engineering',
        open: true,
      },
    });
    cleanupIds.jobPostingIds.push(job.id);

    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000); // 200 days old (exceeds 180-day retention)
    const oldApplication = await prisma.application.create({
      data: {
        personId: candidate.id,
        roleId: job.id,
        stage: AppStage.APPLIED,
        resumeUrl: 'https://s3.amazonaws.com/resumes/tara_cv_confidential.pdf',
        portfolioUrl: 'https://github.com/tara-designs',
        interviewNotes: 'Candidate screened in preliminary round.',
        appliedAt: oldDate,
      },
    });
    cleanupIds.applicationIds.push(oldApplication.id);
    console.log(`✅ Candidate & 200-day-old Application created: '${oldApplication.id}'`);

    // -------------------------------------------------------------
    // Step 2: Testing Right to Data Portability (exportPersonData)
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Right to Data Portability (Export Dossier) ---');

    const exportedDossier = await personsService.exportPersonData(client.id);
    console.log(`✅ Data Portability Export generated for '${exportedDossier.dossier.profile.fullName}' at ${exportedDossier.exportedAt}`);
    console.log(`   - Associated Leads: ${exportedDossier.dossier.leads.length}`);
    console.log(`   - Associated Projects: ${exportedDossier.dossier.projects.length}`);
    console.log(`   - Associated Invoices: ${exportedDossier.dossier.invoices.length}`);
    console.log(`   - Associated Communications: ${exportedDossier.dossier.communications.length}`);

    if (exportedDossier.dossier.invoices.length === 0 || exportedDossier.dossier.communications.length === 0) {
      throw new Error('Data portability export missing invoices or communications!');
    }

    // -------------------------------------------------------------
    // Step 3: Testing Right to be Forgotten / PII Erasure (erasePersonData)
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing Right to be Forgotten / PII Erasure ---');

    const erasureResult = await personsService.erasePersonData(client.id, 'Customer requested erasure under GDPR Article 17', admin.id);
    console.log(`✅ Erasure Execution: ${erasureResult.message}`);
    console.log(`   New Anonymized Name: '${erasureResult.anonymizedProfile.fullName}' | Email: '${erasureResult.anonymizedProfile.email}'`);

    // Verify PII is gone from DB
    const erasedPersonInDb = await prisma.person.findUnique({ where: { id: client.id } });
    if (!erasedPersonInDb || erasedPersonInDb.phone !== null || !erasedPersonInDb.email?.includes('@anonymized.internal')) {
      throw new Error('Person PII was not properly erased in database!');
    }
    console.log(`✅ Verified in DB: Phone is null: ${erasedPersonInDb.phone === null}, Email anonymized: ${erasedPersonInDb.email}`);

    // Verify comms log was redacted
    const redactedComms = await prisma.commsLog.findUnique({ where: { id: commsLog.id } });
    if (!redactedComms || redactedComms.content !== '[REDACTED DUE TO DATA ERASURE]') {
      throw new Error('CommsLog sensitive content was not redacted during erasure!');
    }
    console.log(`✅ Verified CommsLog content redacted: "${redactedComms.content}"`);

    // Verify invoice remains intact for statutory tax/financial compliance
    const intactInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    if (!intactInvoice || intactInvoice.totalAmount !== 88500) {
      throw new Error('Accounting violation: Invoice total was corrupted during erasure!');
    }
    console.log(`✅ Verified Financial Integrity: Invoice '${intactInvoice.invoiceNumber}' preserved (Total: ₹${intactInvoice.totalAmount})`);

    // -------------------------------------------------------------
    // Step 4: Testing Automated Data Retention Policy (CV Purge)
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Testing Automated Data Retention Policy ---');

    const retentionResult = await automationService.runDataRetentionPolicy({ applicantRetentionDays: 180 });
    console.log(`✅ Retention Policy Run: Purged CVs older than ${retentionResult.applicantRetentionDays} days: ${retentionResult.expiredApplicationsPurged} application(s)`);

    const purgedAppInDb = await prisma.application.findUnique({ where: { id: oldApplication.id } });
    if (!purgedAppInDb || purgedAppInDb.resumeUrl !== null || purgedAppInDb.portfolioUrl !== null) {
      throw new Error('Data retention policy failed: Expired application resumeUrl was not purged!');
    }
    console.log(`✅ Verified expired application resumeUrl purged to null: ${purgedAppInDb.resumeUrl === null}`);
    console.log(`   Notes updated to: "${purgedAppInDb.interviewNotes}"`);

    // -------------------------------------------------------------
    // Step 5: Testing Production Deep Health Check
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing Production Deep Health Check ---');

    const health = await appService.getHealthStatus();
    console.log(`✅ Health Status: ${health.status.toUpperCase()} | Database: ${health.database.status} (Latency: ${health.database.queryLatencyMs}ms)`);
    console.log(`   System: Node ${health.system.nodeVersion} on ${health.system.platform} | RSS Memory: ${health.system.memoryMB.rss} MB`);
    console.log(`   Core Entities count: ${JSON.stringify(health.entityMetrics)}`);

    if (health.status !== 'healthy' || health.database.status !== 'connected') {
      throw new Error('Production health check failed!');
    }

    // -------------------------------------------------------------
    // Step 6: Testing Automated Database Backup & Snapshot Drill
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Testing Database Backup & Snapshot Verification Drill ---');

    const backupDrillManifest = await appService.triggerBackupDrill(admin.id);
    console.log(`✅ Backup Snapshot Drill Completed: ID: '${backupDrillManifest.backupId}' [Status: ${backupDrillManifest.status}]`);
    console.log(`   Duration: ${backupDrillManifest.verificationDurationMs}ms | Restorability Check: ${backupDrillManifest.restorabilityCheck}`);
    console.log(`   Total System Records Verified: ${backupDrillManifest.totalRecordsVerified}`);
    console.log(`   Table breakdown: ${JSON.stringify(backupDrillManifest.verifiedTables)}`);

    if (backupDrillManifest.restorabilityCheck !== 'PASSED') {
      throw new Error('Backup restore verification drill failed!');
    }

    // Verify audit log of drill
    const drillAudit = await prisma.auditLog.findFirst({
      where: { action: 'BACKUP_RESTORE_DRILL_COMPLETED', entityId: backupDrillManifest.backupId },
    });
    if (!drillAudit) {
      throw new Error('Audit log entry for backup drill was not recorded!');
    }
    console.log(`✅ Verified Audit Trail entry for backup drill: ${drillAudit.action} (${drillAudit.entityId})`);

    // -------------------------------------------------------------
    // Step 7: Cleanup Test Records
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Cleaning up Test Records ---');
    if (cleanupIds.commsLogIds.length > 0) {
      await prisma.commsLog.deleteMany({ where: { id: { in: cleanupIds.commsLogIds } } });
    }
    if (cleanupIds.invoiceIds.length > 0) {
      await prisma.invoice.deleteMany({ where: { id: { in: cleanupIds.invoiceIds } } });
    }
    if (cleanupIds.projectIds.length > 0) {
      await prisma.project.deleteMany({ where: { id: { in: cleanupIds.projectIds } } });
    }
    if (cleanupIds.leadIds.length > 0) {
      await prisma.lead.deleteMany({ where: { id: { in: cleanupIds.leadIds } } });
    }
    if (cleanupIds.applicationIds.length > 0) {
      await prisma.application.deleteMany({ where: { id: { in: cleanupIds.applicationIds } } });
    }
    if (cleanupIds.jobPostingIds.length > 0) {
      await prisma.jobPosting.deleteMany({ where: { id: { in: cleanupIds.jobPostingIds } } });
    }
    if (cleanupIds.personIds.length > 0) {
      await prisma.person.deleteMany({ where: { id: { in: cleanupIds.personIds } } });
    }
    if (cleanupIds.staffIds.length > 0) {
      await prisma.staff.deleteMany({ where: { id: { in: cleanupIds.staffIds } } });
    }
    console.log('✅ Cleaned up all test entities.');

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 11 (PRIVACY, RETENTION & BACKUP DRILL) TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error: any) {
    console.error('\n❌ Phase 11 Verification failed with error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

runPhase11Verification().catch(() => process.exit(1));

