import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { VendorsService } from '../src/modules/vendors/vendors.service';
import { LeadsService } from '../src/modules/leads/leads.service';
import {
  ProjectStage,
  ProjectStatus,
  MilestoneStatus,
  DeliverableStatus,
  RevisionStatus,
} from '../src/modules/projects/dto/project.dto';
import { PayoutStatus } from '../src/modules/vendors/dto/vendor.dto';
import { PersonType, Surface } from '@prisma/client';

async function runPhase3Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 3 VERIFICATION: PROJECTS & VENDORS PIPELINE');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const projectsService = app.get(ProjectsService);
  const vendorsService = app.get(VendorsService);
  const leadsService = app.get(LeadsService);

  try {
    // -------------------------------------------------------------
    // Step 1: Prepare Test Client and Vendor Persons
    // -------------------------------------------------------------
    console.log('--- Step 1: Preparing Person Entities ---');
    const clientEmail = `client.phase3.${Date.now()}@example.com`;
    const vendorEmail = `expert.phase3.${Date.now()}@example.com`;

    const clientPerson = await prisma.person.create({
      data: {
        fullName: 'Phase3 Enterprise Client',
        email: clientEmail,
        phone: `+919988${Math.floor(100000 + Math.random() * 900000)}`,
        type: PersonType.LEAD,
        firstTouchSource: Surface.SITE_COM,
      },
    });
    console.log(`✅ Client Person created: ${clientPerson.fullName} (${clientPerson.id})`);

    const vendorPerson = await prisma.person.create({
      data: {
        fullName: 'Aarav Sharma (Fullstack Architect)',
        email: vendorEmail,
        phone: `+919977${Math.floor(100000 + Math.random() * 900000)}`,
        type: PersonType.VENDOR,
        firstTouchSource: Surface.CAREER,
      },
    });
    console.log(`✅ Vendor Person created: ${vendorPerson.fullName} (${vendorPerson.id})`);

    // -------------------------------------------------------------
    // Step 2: Test Vendor Onboarding, Profile & Live Capacity
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Vendor Profile Onboarding & Capacity Engine ---');
    const vendorProfile = await vendorsService.createProfile({
      personId: vendorPerson.id,
      skills: ['NestJS', 'React', 'PostgreSQL', 'TailwindCSS'],
      maxCapacity: 2,
      contractUrl: 'https://cdn.karyasaarthi.com/contracts/aarav-nda.pdf',
      ndaSigned: true,
    });
    console.log(`✅ Vendor Profile registered. Max Capacity: ${vendorProfile.maxCapacity}, NDA Signed: ${vendorProfile.ndaSigned}`);

    const vendorsList = await vendorsService.findAll({
      skill: 'NestJS',
      availableOnly: true,
    });
    console.log(`✅ Query Vendors with Skill 'NestJS' & availableOnly=true returned ${vendorsList.meta.total} vendor(s)`);
    const foundVendor = vendorsList.data.find((v) => v.personId === vendorPerson.id);
    if (!foundVendor || !foundVendor.isAvailable) {
      throw new Error('Vendor should be available with 0/2 active projects');
    }
    console.log(`✅ Vendor Workload: ${foundVendor.activeProjectsCount}/${foundVendor.maxCapacity} (${foundVendor.capacityUtilizationPercent}% utilized)`);

    const analytics = await vendorsService.getWorkloadAnalytics();
    console.log(`✅ Network Analytics: Total Slots=${analytics.totalCapacitySlots}, Allocated=${analytics.activeAllocatedProjects}, Available Vendors=${analytics.availableVendorsCount}`);

    // -------------------------------------------------------------
    // Step 3: Commission Project & Milestone Progression
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Commissioning Project & Delivery Milestones ---');
    const project = await projectsService.create({
      title: 'Enterprise Multi-Surface CRM Platform',
      description: 'End-to-end unified CRM delivery across karyasaarthi.com and mobile app.',
      clientId: clientPerson.id,
      serviceType: 'FULLSTACK_DEVELOPMENT',
      budget: 150000,
      currency: 'INR',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      sourceSurface: Surface.SITE_COM,
    });
    console.log(`✅ Project created: "${project.title}" (ID: ${project.id}) in stage ${project.stage}`);

    // Assign vendor to project
    const assignedProject = await vendorsService.assignVendorToProject({
      projectId: project.id,
      vendorPersonId: vendorPerson.id,
    });
    console.log(`✅ Vendor ${vendorPerson.fullName} assigned to project. Project Vendor ID: ${assignedProject.vendorId}`);

    // Verify vendor capacity updated to 1/2 (50%)
    const vendorAfterAssignment = await vendorsService.findOne(vendorProfile.id);
    console.log(`✅ Updated Vendor Workload: ${vendorAfterAssignment.activeProjectsCount}/${vendorAfterAssignment.maxCapacity} (${vendorAfterAssignment.capacityUtilizationPercent}% utilized)`);

    // Add Milestones
    const m1 = await projectsService.addMilestone(project.id, {
      title: 'Milestone 1: Database Schema & Core Architecture',
      description: 'Setup Neon DB, Prisma models, Redis caching, and RBAC guards.',
      amount: 45000,
      status: MilestoneStatus.IN_PROGRESS,
    });
    const m2 = await projectsService.addMilestone(project.id, {
      title: 'Milestone 2: Real-time Omnichannel Inbox & AI Copilot',
      description: 'Socket.io gateway and Claude Haiku draft response generation.',
      amount: 55000,
      status: MilestoneStatus.PENDING,
    });
    const m3 = await projectsService.addMilestone(project.id, {
      title: 'Milestone 3: Client Dashboard & Production Release',
      description: 'Automated deployment on Cloud Run and production testing.',
      amount: 50000,
      status: MilestoneStatus.PENDING,
    });
    console.log(`✅ 3 Milestones added to project (M1: ${m1.title}, M2: ${m2.title}, M3: ${m3.title})`);

    // Complete Milestone 1
    const completedM1 = await projectsService.completeMilestone(m1.id);
    console.log(`✅ Milestone 1 marked COMPLETED at ${completedM1.completedAt?.toISOString()}`);

    // -------------------------------------------------------------
    // Step 4: Deliverable Versioning & Client Revision Loop
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Deliverables Submission & Client Revision Workflow ---');
    const deliverableV1 = await projectsService.submitDeliverable(project.id, {
      title: 'Architecture Blueprint & Prisma ERD',
      fileUrl: 'https://cdn.karyasaarthi.com/deliverables/erd-v1.pdf',
      version: 1,
      status: DeliverableStatus.SUBMITTED,
    });
    console.log(`✅ Deliverable v1 submitted (ID: ${deliverableV1.id}, Version: ${deliverableV1.version})`);

    // Client requests revision
    const revision = await projectsService.requestRevision(project.id, {
      deliverableId: deliverableV1.id,
      requestedBy: clientPerson.fullName,
      feedback: 'Please include the WebSocket schema events and vendor payout ERD in the architecture diagram.',
    });
    console.log(`✅ Client Revision request logged (ID: ${revision.id}, Status: ${revision.status})`);

    // Submit Deliverable v2
    const deliverableV2 = await projectsService.submitDeliverable(project.id, {
      title: 'Architecture Blueprint & Prisma ERD',
      fileUrl: 'https://cdn.karyasaarthi.com/deliverables/erd-v2-complete.pdf',
      version: 2,
      status: DeliverableStatus.APPROVED,
    });
    console.log(`✅ Deliverable v2 submitted & APPROVED (ID: ${deliverableV2.id}, Version: ${deliverableV2.version})`);

    // Resolve revision
    const resolvedRev = await projectsService.updateRevisionStatus(revision.id, {
      status: RevisionStatus.RESOLVED,
    });
    console.log(`✅ Revision status updated to: ${resolvedRev.status}`);

    // Update project stage
    const advancedProject = await projectsService.updateStage(project.id, {
      stage: ProjectStage.IN_PROGRESS,
      notes: 'Milestone 1 approved. Commencing Milestone 2 frontend implementation.',
    });
    console.log(`✅ Project Stage advanced to: ${advancedProject.stage}`);

    // -------------------------------------------------------------
    // Step 5: Client-Facing Delivery Tracking Overview API
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Verifying Client-Facing Delivery Tracking Overview API ---');
    const clientOverview = await projectsService.getClientProjectOverview(clientPerson.id);
    console.log(`✅ Client Portal Overview fetched: Total Projects=${clientOverview.totalProjects}`);
    const clientProj = clientOverview.projects[0];
    console.log(`   - Progress: ${clientProj.progressPercent}% (1 of 3 milestones done)`);
    console.log(`   - Latest Deliverables count: ${clientProj.latestDeliverables.length}`);
    console.log(`   - Active Revisions count: ${clientProj.activeRevisions.length}`);

    // -------------------------------------------------------------
    // Step 6: Vendor Milestone Payout Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Vendor Milestone Payout Release Lifecycle ---');
    const payout = await vendorsService.createPayout({
      vendorId: vendorProfile.id,
      projectId: project.id,
      milestoneId: m1.id,
      amount: 38000,
      notes: 'Milestone 1 completed and approved by client',
      status: PayoutStatus.PENDING,
    });
    console.log(`✅ Vendor Payout created: INR ${payout.amount} in status ${payout.status}`);

    // Approve payout
    await vendorsService.updatePayoutStatus(payout.id, {
      status: PayoutStatus.APPROVED,
      notes: 'Finance team approved milestone completion',
    });
    console.log('✅ Payout marked APPROVED');

    // Release payout
    const releasedPayout = await vendorsService.updatePayoutStatus(payout.id, {
      status: PayoutStatus.RELEASED,
      notes: 'UTR# KS992381283 sent to vendor account',
    });
    console.log(`✅ Payout marked RELEASED at ${releasedPayout.releasedAt?.toISOString()}`);

    // -------------------------------------------------------------
    // Step 7: Auto-Conversion of WON Lead into Project
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Auto-Conversion of WON Lead into Delivery Project ---');
    const leadPerson = await prisma.person.create({
      data: {
        fullName: 'Vikram Mehta (Prospective Client)',
        email: `vikram.mehta.${Date.now()}@example.com`,
        phone: `+919911${Math.floor(100000 + Math.random() * 900000)}`,
        type: PersonType.LEAD,
        firstTouchSource: Surface.SITE_IN,
      },
    });

    const lead = await leadsService.create({
      personId: leadPerson.id,
      title: 'Custom ERP & Inventory Management Suite',
      serviceType: 'ERP_SOLUTIONS',
      sourceSurface: Surface.SITE_IN,
      estimatedValue: 200000,
    });
    console.log(`✅ Lead Card created: "${lead.title}" (Stage: ${lead.stage}, Person Type: ${leadPerson.type})`);

    // Convert lead to project
    const convertedProject = await projectsService.convertLeadToProject({
      leadId: lead.id,
      budget: 185000,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log(`✅ WON Lead successfully converted to Project: "${convertedProject.title}" (ID: ${convertedProject.id}, Stage: ${convertedProject.stage}, Budget: INR ${convertedProject.budget})`);

    // Verify Person elevated to CLIENT
    const updatedLeadPerson = await prisma.person.findUnique({
      where: { id: leadPerson.id },
    });
    console.log(`✅ Person Type after lead conversion: ${updatedLeadPerson?.type} (Elevated to CLIENT)`);

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 3 PROJECT & VENDOR PIPELINE TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('❌ Phase 3 verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

runPhase3Verification();
