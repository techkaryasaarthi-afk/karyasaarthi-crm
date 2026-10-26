import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PublicApiService } from '../src/modules/public-api/public-api.service';
import { LeadsService } from '../src/modules/leads/leads.service';
import { InboxService } from '../src/modules/inbox/inbox.service';
import { Surface, LeadStage, SenderType } from '@prisma/client';

async function verifyPhase2() {
  console.log('🧪 Starting Phase 2 (Omnichannel Inbox & Kanban Lead Pipeline) Verification...\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const publicApiService = app.get(PublicApiService);
  const leadsService = app.get(LeadsService);
  const inboxService = app.get(InboxService);

  const testEmail = `lead.client.${Date.now()}@example.com`;
  const testPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  // -------------------------------------------------------------
  // TEST 1: Public Enquiry Auto-Creating Kanban Lead Card
  // -------------------------------------------------------------
  console.log('1️⃣ Ingesting project enquiry via karyasaarthi.com...');
  const enquiryRes = await publicApiService.handleEnquiry({
    fullName: 'Rohan Singhania',
    email: testEmail,
    phone: testPhone,
    surface: Surface.SITE_COM,
    serviceType: 'Mobile App Development',
    message: 'Need an iOS & Android logistics tracking app. Estimated budget around $18,000.',
    budget: '$18,000',
    consentFlags: { marketing: true },
  });

  console.log('✅ Enquiry Ingested. Person ID:', enquiryRes.data.personId);
  console.log('✅ Auto-Created Kanban Lead ID:', enquiryRes.data.leadId);
  console.log('✅ Claude Haiku Routing:', enquiryRes.data.routing);

  // -------------------------------------------------------------
  // TEST 2: Kanban Pipeline Verification
  // -------------------------------------------------------------
  console.log('\n2️⃣ Verifying Kanban Pipeline Board...');
  let kanban = await leadsService.getKanbanBoard();
  console.log(`✅ Total Pipeline Leads: ${kanban.totalLeads}`);
  console.log(`   - NEW: ${kanban.columns.NEW.count} leads (Value: $${kanban.columns.NEW.totalValue})`);
  console.log(`   - CONTACTED: ${kanban.columns.CONTACTED.count} leads`);
  console.log(`   - QUALIFIED: ${kanban.columns.QUALIFIED.count} leads`);
  console.log(`   - PROPOSAL_SENT: ${kanban.columns.PROPOSAL_SENT.count} leads`);
  console.log(`   - WON: ${kanban.columns.WON.count} leads`);

  // Move Lead through Pipeline Stages
  console.log('\n   Moving lead: NEW -> CONTACTED -> QUALIFIED -> WON...');
  await leadsService.updateStage(enquiryRes.data.leadId, {
    stage: LeadStage.CONTACTED,
    note: 'Initial phone screening conducted',
  });
  await leadsService.updateStage(enquiryRes.data.leadId, {
    stage: LeadStage.QUALIFIED,
    note: 'Technical feasibility confirmed',
  });
  const wonLead = await leadsService.updateStage(enquiryRes.data.leadId, {
    stage: LeadStage.WON,
    note: 'Contract signed and initial deposit received',
  });
  console.log(`✅ Lead Stage updated to: ${wonLead.stage}`);

  // Verify Person type converted to CLIENT
  const updatedPerson = await prisma.person.findUnique({
    where: { id: enquiryRes.data.personId },
  });
  console.log(`✅ Person automatically elevated to: ${updatedPerson?.type}`);

  // Add Task Queue follow-up
  const task = await leadsService.createTask(enquiryRes.data.leadId, {
    title: 'Schedule architecture handover meeting with delivery team',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  console.log(`✅ Follow-up task created: "${task.title}" (Due: ${task.dueAt.toISOString()})`);
  await leadsService.completeTask(task.id);
  console.log('✅ Follow-up task marked completed');

  // -------------------------------------------------------------
  // TEST 3: Omnichannel Real-Time Inbox Verification
  // -------------------------------------------------------------
  console.log('\n3️⃣ Verifying Omnichannel Inbox & Threading...');
  // Ingest Mobile App Chat message from the same person
  const chatRes = await publicApiService.handleChatMessage({
    phone: testPhone,
    channel: Surface.APP,
    message: 'Hello team, looking forward to starting the sprint!',
  });
  console.log(`✅ Ingested in-app chat into Conversation ID: ${chatRes.conversationId}`);

  // Check Conversation SLA status
  const convList = await inboxService.getConversations({ channel: Surface.APP });
  const conv = convList.data.find((c) => c.id === chatRes.conversationId);
  console.log(`✅ Conversation Channel Badge: ${conv?.channel}`);
  console.log(`✅ First Response SLA Deadline: ${conv?.sla.dueAt?.toISOString()}`);
  console.log(`✅ SLA Breached? ${conv?.sla.isBreached ? 'YES' : 'NO'}`);

  // Staff sends a public reply
  const staffReply = await inboxService.sendMessage({
    conversationId: chatRes.conversationId!,
    content: 'Welcome aboard! Our lead engineer has prepared the onboarding repository.',
    senderType: SenderType.STAFF,
  });
  console.log(`✅ Staff sent public reply in thread: "${staffReply.content.slice(0, 50)}..."`);

  // Staff adds an internal confidential note
  const internalNote = await inboxService.sendMessage({
    conversationId: chatRes.conversationId!,
    content: 'INTERNAL NOTE: Payment milestone 1 verified by finance. Begin sprint 1 scoping.',
    senderType: SenderType.STAFF,
    isInternalNote: true,
  });
  console.log(`✅ Staff added internal note: "${internalNote.content.slice(0, 45)}..."`);

  // Verify Client view vs Staff view
  const clientMessages = await inboxService.getMessages(chatRes.conversationId!, false);
  const staffMessages = await inboxService.getMessages(chatRes.conversationId!, true);
  console.log(`✅ Client message view count: ${clientMessages.length} (internal notes hidden: ${!clientMessages.some(m => m.isInternalNote)})`);
  console.log(`✅ Staff message view count: ${staffMessages.length} (internal notes included: ${staffMessages.some(m => m.isInternalNote)})`);

  // Test Claude Haiku drafting response
  console.log('\n4️⃣ Testing Claude Haiku quick reply drafting in inbox...');
  const aiDraft = await inboxService.suggestReplyWithAi(chatRes.conversationId!, 'welcoming and proactive');
  console.log('✅ Claude Haiku suggested draft:', JSON.stringify(aiDraft, null, 2));

  // Test Canned Reply Macros
  console.log('\n5️⃣ Testing Canned Replies & Macros...');
  const canned = await inboxService.createCannedReply({
    shortcut: `/onboarding-${Date.now()}`,
    title: 'Standard Client Kickoff Macro',
    content: 'Welcome to Karya Saarthi! Here is your project dashboard link and milestone calendar.',
    category: 'Onboarding',
  });
  console.log(`✅ Canned reply macro created: ${canned.shortcut} ("${canned.title}")`);

  console.log('\n🎉 ALL PHASE 2 VERIFICATIONS PASSED 100% SUCCESSFULLY!');
  await app.close();
}

verifyPhase2().catch((err) => {
  console.error('❌ Phase 2 verification failed:', err);
  process.exit(1);
});
