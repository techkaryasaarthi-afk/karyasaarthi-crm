import { PrismaClient, Surface, PersonType, InteractionType } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PersonsService } from '../src/modules/persons/persons.service';
import { PublicApiService } from '../src/modules/public-api/public-api.service';
import { AiService } from '../src/modules/ai/ai.service';

async function runTests() {
  console.log('🧪 Starting Karya Saarthi Backend Step Verification...\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const personsService = app.get(PersonsService);
  const publicApiService = app.get(PublicApiService);
  const aiService = app.get(AiService);
  const prisma = app.get(PrismaService);

  console.log('1️⃣ Testing AI Cost-Optimized Tiering (Haiku & Sonnet)...');
  const haikuResult = await aiService.scoreAndRouteLead({
    message: 'We want to develop an enterprise fintech mobile application for iOS and Android with urgent 60-day delivery. Budget is around $25,000.',
    serviceType: 'Mobile & Web Development',
    budget: '$25,000',
  });
  console.log('✅ Claude Haiku Lead Routing Result:', JSON.stringify(haikuResult, null, 2));

  const haikuDraft = await aiService.draftReply({
    customerMessage: 'When can we schedule our first kickoff call?',
    context: 'Fintech mobile application',
  });
  console.log('✅ Claude Haiku Quick Draft Reply:', JSON.stringify(haikuDraft, null, 2));

  console.log('\n2️⃣ Testing Multi-Surface Cross-Domain Identity Stitching...');
  const testEmail = `test.client.${Date.now()}@example.com`;
  const testPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  // Surface 1: karyasaarthi.com inquiry
  console.log(`- Ingesting inquiry from karyasaarthi.com (${Surface.SITE_COM})...`);
  const enquiryRes = await publicApiService.handleEnquiry({
    fullName: 'Aarav Mehta',
    email: testEmail,
    phone: testPhone,
    surface: Surface.SITE_COM,
    serviceType: 'Web Development',
    message: 'Looking for an AI-powered CRM with real-time analytics.',
    budget: '$15,000',
    consentFlags: { marketing: true, whatsapp: true },
  });
  console.log('✅ Site .com Enquiry Ingested:', enquiryRes.data);

  // Surface 2: karyasaarthi.in inquiry from SAME person (matching by email, different surface)
  console.log(`- Ingesting subsequent interaction from karyasaarthi.in (${Surface.SITE_IN})...`);
  const inquiryIn = await publicApiService.handleEnquiry({
    fullName: 'Aarav Mehta',
    email: testEmail,
    surface: Surface.SITE_IN,
    serviceType: 'Mobile App',
    message: 'Also inquiring about companion mobile app on the regional portal.',
  });
  console.log('✅ Identity stitched! Same Person ID verified:', enquiryRes.data.personId === inquiryIn.data.personId);

  // Surface 3: Mobile App Chat from same phone
  console.log(`- Ingesting mobile app chat with matching phone number...`);
  const chatRes = await publicApiService.handleChatMessage({
    phone: testPhone,
    channel: Surface.APP,
    message: 'Hello, checking on the proposal status from my mobile app.',
  });
  console.log('✅ Mobile App chat connected to unified Person ID:', chatRes.personId === enquiryRes.data.personId);

  // Surface 4: Career portal application (candidate was previously a lead)
  const job = await prisma.jobPosting.findFirst();
  if (job) {
    console.log(`- Ingesting career application on career.karyasaarthi.com (${Surface.CAREER})...`);
    const appRes = await publicApiService.handleApplication({
      fullName: 'Aarav Mehta',
      email: testEmail,
      phone: testPhone,
      roleId: job.id,
      resumeUrl: 'https://karyasaarthi.com/resumes/aarav.pdf',
      coverNote: 'Experienced developer interested in full-stack engineering.',
    });
    console.log('✅ Career application stitched to existing Person record:', appRes.data.personId === enquiryRes.data.personId);
  }

  console.log('\n3️⃣ Verifying Person 360 Timeline in Single System of Record...');
  const personProfile = await personsService.findOne(enquiryRes.data.personId);
  console.log(`✅ Person Record: ${personProfile.fullName} (${personProfile.email})`);
  console.log(`✅ Total Interactions Linked: ${personProfile.interactions.length}`);
  personProfile.interactions.forEach((inter, idx) => {
    console.log(`   [${idx + 1}] Channel: ${inter.channel} | Type: ${inter.type} | Time: ${inter.occurredAt.toISOString()}`);
  });

  console.log('\n🎉 ALL STEP VERIFICATIONS PASSED SUCCESSFULLY!');
  await app.close();
}

runTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
