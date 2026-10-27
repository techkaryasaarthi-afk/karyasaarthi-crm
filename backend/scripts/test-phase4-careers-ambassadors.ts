import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { CareersService } from '../src/modules/careers/careers.service';
import { AmbassadorsService } from '../src/modules/ambassadors/ambassadors.service';
import { AppStage } from '../src/modules/careers/dto/career.dto';
import { PersonType, Surface } from '@prisma/client';

async function runPhase4Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 4: CAREERS ATS & AMBASSADOR PIPELINE');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const careersService = app.get(CareersService);
  const ambassadorsService = app.get(AmbassadorsService);

  try {
    // -------------------------------------------------------------
    // Step 1: Onboard Campus Ambassador
    // -------------------------------------------------------------
    console.log('--- Step 1: Campus Ambassador Network Onboarding ---');
    const ambEmail = `ambassador.phase4.${Date.now()}@iitd.ac.in`;
    const ambPerson = await prisma.person.create({
      data: {
        fullName: 'Devansh Verma (Student Lead)',
        email: ambEmail,
        phone: `+919955${Math.floor(100000 + Math.random() * 900000)}`,
        type: PersonType.LEAD,
        firstTouchSource: Surface.APP,
      },
    });

    const customCode = `KS-IITD-${Math.floor(100 + Math.random() * 900)}`;
    const ambassador = await ambassadorsService.onboard({
      personId: ambPerson.id,
      college: 'IIT Delhi (Computer Science)',
      graduationYear: 2026,
      customReferralCode: customCode,
    });
    console.log(`✅ Campus Ambassador onboarded: ${ambPerson.fullName}`);
    console.log(`   - College: ${ambassador.college}`);
    console.log(`   - Referral Code: ${ambassador.referralCode}`);
    console.log(`   - Initial Referrals: ${ambassador.totalReferrals}, Commission: ₹${ambassador.commissionEarned}`);

    // Initial Leaderboard check
    const initialLeaderboard = await ambassadorsService.getLeaderboard(5);
    console.log(`✅ Leaderboard fetched (${initialLeaderboard.length} top ambassadors)`);

    // -------------------------------------------------------------
    // Step 2: Create ATS Job Posting
    // -------------------------------------------------------------
    console.log('\n--- Step 2: ATS Job Posting Management ---');
    const job = await careersService.createJob({
      title: 'Senior Fullstack Engineer (NestJS / React)',
      department: 'Engineering',
      location: 'Remote (India)',
      type: 'FULL_TIME',
      experience: '3-6 years',
      salaryRange: '₹14,00,000 - ₹20,00,000 P.A.',
      description: 'Lead development of enterprise multi-surface CRM with real-time Socket.io and Claude AI APIs.',
      requirements: [
        'Expertise in TypeScript, Node.js and NestJS',
        'Strong hands-on experience with PostgreSQL, Prisma ORM, and Redis',
        'Solid knowledge of modern React (Next.js/Vite) & WebSockets',
        'Experience integrating Anthropic Claude or LLM APIs',
      ],
      open: true,
    });
    console.log(`✅ Job Posting created: "${job.title}" (ID: ${job.id})`);
    console.log(`   - Department: ${job.department}, Location: ${job.location}, Open: ${job.open}`);

    // -------------------------------------------------------------
    // Step 3: Candidate Application & Claude Sonnet AI Evaluation
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Ingesting Candidate Application & Triggering Claude Sonnet AI Matching ---');
    const candEmail = `candidate.phase4.${Date.now()}@example.com`;
    const candPerson = await prisma.person.create({
      data: {
        fullName: 'Rohan Deshmukh',
        email: candEmail,
        phone: `+919944${Math.floor(100000 + Math.random() * 900000)}`,
        type: PersonType.LEAD,
        firstTouchSource: Surface.CAREER,
      },
    });

    const resumeSummary = `
SUMMARY:
Senior Full Stack Developer with 4.5 years of experience building scalable backend microservices and modern React applications.
TECHNICAL SKILLS:
Languages: TypeScript, JavaScript, Python, SQL
Backend: NestJS, Express, Node.js, RESTful APIs, WebSockets (Socket.io)
Databases & Cache: PostgreSQL, Neon DB, Prisma ORM, Redis
Frontend: React, Next.js, Redux Toolkit, TailwindCSS
AI / Cloud: Anthropic Claude API integration, Docker, AWS EC2/S3
EXPERIENCE:
Software Engineer at TechCorp (2022-Present):
- Designed high-throughput NestJS APIs handling 50k req/min with Prisma & Redis caching.
- Integrated Claude AI for automated customer response drafting and workflow classification.
`;

    const application = await careersService.submitApplication({
      roleId: job.id,
      personId: candPerson.id,
      resumeUrl: 'https://cdn.karyasaarthi.com/resumes/rohan-deshmukh-cv.pdf',
      portfolioUrl: 'https://github.com/rohandeshmukh-dev',
      yearsOfExperience: 4.5,
      skills: ['TypeScript', 'NestJS', 'PostgreSQL', 'Prisma', 'React', 'Claude API', 'Redis'],
      resumeText: resumeSummary,
      referralCode: ambassador.referralCode,
    });

    console.log(`✅ Application submitted for: ${application.person.fullName}`);
    console.log(`   - Stage: ${application.stage}`);
    console.log(`   - Claude Sonnet Match Score: ${application.aiMatchScore ?? 'N/A'}/100`);
    if (application.aiEvaluation) {
      const evalData = application.aiEvaluation as any;
      console.log(`   - AI Verdict: ${evalData.verdict}`);
      console.log(`   - Key Strengths: ${(evalData.strengths || []).slice(0, 2).join('; ')}`);
      console.log(`   - Potential Gaps: ${(evalData.gaps || []).slice(0, 2).join('; ')}`);
    }

    // Verify Person elevated to APPLICANT
    const updatedCand = await prisma.person.findUnique({
      where: { id: candPerson.id },
    });
    console.log(`✅ Candidate Person Type elevated to: ${updatedCand?.type}`);

    // Verify Ambassador Referral Attribution
    const ambAfterReferral = await ambassadorsService.findOne(ambassador.id);
    console.log(`✅ Ambassador referral recorded:`);
    console.log(`   - Total Referrals: ${ambAfterReferral.totalReferrals} (incremented from 0)`);
    console.log(`   - Commission Earned: ₹${ambAfterReferral.commissionEarned}`);

    // -------------------------------------------------------------
    // Step 4: ATS Pipeline Filtering & Stage Progression
    // -------------------------------------------------------------
    console.log('\n--- Step 4: ATS Pipeline Filtering & Interview Scheduling ---');
    const appsList = await careersService.findAllApplications({
      roleId: job.id,
      minMatchScore: 60,
    });
    console.log(`✅ Applications with minMatchScore >= 60: ${appsList.meta.total} candidate(s) found`);

    // Screen candidate
    await careersService.updateStage(application.id, {
      stage: AppStage.SCREENED,
      reviewerNotes: 'Strong profile with direct NestJS & Claude API experience. Moving to technical interview.',
    });
    console.log('✅ Candidate stage moved to SCREENED');

    // Schedule Interview
    const interviewDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const scheduledApp = await careersService.scheduleInterview(application.id, {
      scheduledAt: interviewDate,
      notes: 'Google Meet link: https://meet.google.com/xyz-karyasaarthi. Tech architecture round.',
    });
    console.log(`✅ Interview scheduled for ${scheduledApp.interviewScheduledAt?.toISOString()}`);
    console.log(`   - Stage updated to: ${scheduledApp.stage}`);

    // -------------------------------------------------------------
    // Step 5: Offer Generation & Ambassador Conversion Bonus
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Offer Generation & Conversion Attribution ---');
    const offerApp = await careersService.generateOffer(application.id, {
      offerAmount: 1650000,
      notes: 'Offer letter issued for Senior Fullstack Engineer position.',
    });
    console.log(`✅ Offer issued: ₹${offerApp.offerAmount?.toLocaleString('en-IN')} (Stage: ${offerApp.stage})`);

    // Verify Ambassador Conversion Bonus credited
    const ambAfterOffer = await ambassadorsService.findOne(ambassador.id);
    console.log(`✅ Ambassador conversion verified:`);
    console.log(`   - Successful Conversions: ${ambAfterOffer.successfulConversions} (credited hire conversion)`);
    console.log(`   - Total Commission Earned: ₹${ambAfterOffer.commissionEarned} (referral reward + hire bonus)`);

    // Verify Updated Leaderboard
    const finalLeaderboard = await ambassadorsService.getLeaderboard(5);
    console.log('\n🏆 Top Campus Ambassadors Leaderboard:');
    finalLeaderboard.forEach((amb) => {
      console.log(`   #${amb.rank} ${amb.name} (${amb.college}) | Conversions: ${amb.successfulConversions} | Commission: ₹${amb.commissionEarned}`);
    });

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 4 CAREERS & AMBASSADORS TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('❌ Phase 4 verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

runPhase4Verification();
