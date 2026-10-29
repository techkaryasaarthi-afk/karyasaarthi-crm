import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { SearchService } from '../src/modules/search/search.service';
import { SearchableEntity } from '../src/modules/search/dto/search.dto';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Role, Surface, PersonType, ProjectStage, ProjectStatus, AppStage, InvoiceStatus } from '@prisma/client';

async function runPhase9Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 9: UNIFIED GLOBAL SEARCH & ABUSE RATE LIMITING');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const searchService = app.get(SearchService);
  const reflector = app.get(Reflector);

  const cleanupIds = {
    staffIds: [] as string[],
    personIds: [] as string[],
    leadIds: [] as string[],
    projectIds: [] as string[],
    jobPostingIds: [] as string[],
    applicationIds: [] as string[],
    serviceIds: [] as string[],
    invoiceIds: [] as string[],
  };

  try {
    const timestamp = Date.now();

    // -------------------------------------------------------------
    // Step 1: Setting up Cross-Entity Test Data
    // -------------------------------------------------------------
    console.log('--- Step 1: Setting up Cross-Entity Test Data ---');

    // 1. Staff
    const staff = await prisma.staff.create({
      data: {
        name: 'Aditya Roy (Cloud Specialist)',
        email: `aditya.search.${timestamp}@karyasaarthi.com`,
        passwordHash: 'dummyhash123',
        role: Role.SALES,
        active: true,
      },
    });
    cleanupIds.staffIds.push(staff.id);
    console.log(`✅ Staff created: ${staff.name}`);

    // 2. Person
    const person = await prisma.person.create({
      data: {
        fullName: 'Rohan Mehra',
        email: `rohan.search.${timestamp}@enterprisefintech.io`,
        phone: `+9199887${Math.floor(10000 + Math.random() * 90000)}`,
        type: PersonType.CLIENT,
        firstTouchSource: Surface.SITE_COM,
      },
    });
    cleanupIds.personIds.push(person.id);
    console.log(`✅ Client Person created: ${person.fullName}`);

    // 3. Lead
    const lead = await prisma.lead.create({
      data: {
        personId: person.id,
        title: 'Enterprise FinTech Core Banking Migration',
        serviceType: 'Cloud & Web Development',
        stage: 'QUALIFIED',
        score: 92,
        estimatedValue: 250000,
        sourceSurface: Surface.SITE_COM,
        notes: 'High-security microservices architecture required',
      },
    });
    cleanupIds.leadIds.push(lead.id);
    console.log(`✅ Lead created: '${lead.title}'`);

    // 4. Project
    const project = await prisma.project.create({
      data: {
        clientId: person.id,
        title: 'Enterprise FinTech Trading Engine MVP',
        serviceType: 'Full-Stack Development',
        stage: ProjectStage.IN_PROGRESS,
        status: ProjectStatus.ACTIVE,
        sourceSurface: Surface.SITE_COM,
        description: 'Next.js 15 and NestJS trading platform for institutional accounts',
      },
    });
    cleanupIds.projectIds.push(project.id);
    console.log(`✅ Project created: '${project.title}'`);

    // 5. Job Posting & Application
    const jobPosting = await prisma.jobPosting.create({
      data: {
        title: 'Principal Cloud Architect',
        department: 'Infrastructure',
        location: 'Bengaluru / Hybrid',
        open: true,
      },
    });
    cleanupIds.jobPostingIds.push(jobPosting.id);

    const application = await prisma.application.create({
      data: {
        personId: person.id,
        roleId: jobPosting.id,
        stage: AppStage.INTERVIEW,
        yearsOfExperience: 8,
        skills: ['Kubernetes', 'AWS', 'Terraform', 'NestJS'],
      },
    });
    cleanupIds.applicationIds.push(application.id);
    console.log(`✅ Job & Application created for '${jobPosting.title}'`);

    // 6. Catalogue Service
    const service = await prisma.serviceItem.create({
      data: {
        title: 'Enterprise Cloud Infrastructure & DevOps',
        slug: `enterprise-cloud-devops-${timestamp}`,
        description: 'AWS & GCP Terraform automation, zero-downtime CI/CD pipelines and Kubernetes.',
        category: 'Cloud & Infrastructure',
        basePrice: 150000,
        surfaces: [Surface.SITE_COM, Surface.APP],
        active: true,
      },
    });
    cleanupIds.serviceIds.push(service.id);
    console.log(`✅ Catalogue Service created: '${service.title}'`);

    // 7. Invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-SEARCH-${timestamp.toString().slice(-6)}`,
        clientId: person.id,
        title: 'Enterprise Cloud Milestone 1 Retainer',
        subtotal: 100000,
        totalAmount: 118000,
        status: InvoiceStatus.PENDING,
      },
    });
    cleanupIds.invoiceIds.push(invoice.id);
    console.log(`✅ Invoice created: '${invoice.invoiceNumber}'`);

    // -------------------------------------------------------------
    // Step 2: Testing Broad Cross-Entity Global Search
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Broad Cross-Entity Global Search ("Enterprise") ---');

    const broadSearch = await searchService.searchAll({ q: 'Enterprise' });
    console.log(`🔍 Query: '${broadSearch.query}' -> Total Matched Entities: ${broadSearch.totalResults}`);
    console.log(`   - Leads matched: ${broadSearch.categories.leads.length}`);
    console.log(`   - Projects matched: ${broadSearch.categories.projects.length}`);
    console.log(`   - Services matched: ${broadSearch.categories.services.length}`);
    console.log(`   - Invoices matched: ${broadSearch.categories.invoices.length}`);

    if (broadSearch.categories.leads.length === 0 || broadSearch.categories.projects.length === 0) {
      throw new Error("Broad search failed to match created lead and project for 'Enterprise'");
    }

    const topResult = broadSearch.flatResults[0];
    console.log(`✅ Highest relevance item: [${topResult.badge}] '${topResult.title}' (Score: ${topResult.relevanceScore})`);
    console.log(`   Direct navigation URL: ${topResult.url}`);

    // -------------------------------------------------------------
    // Step 3: Testing Contact / Person Search ("Rohan")
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing Contact / Person Search ("Rohan") ---');

    const personSearch = await searchService.searchAll({ q: 'Rohan' });
    console.log(`🔍 Query: 'Rohan' -> Persons: ${personSearch.categories.persons.length}, Applications: ${personSearch.categories.applications.length}, Leads: ${personSearch.categories.leads.length}`);

    const rohanPerson = personSearch.categories.persons.find((p) => p.title === 'Rohan Mehra');
    if (!rohanPerson) {
      throw new Error("Person search failed to find 'Rohan Mehra'");
    }
    console.log(`✅ Found Person: '${rohanPerson.title}' [Subtitle: ${rohanPerson.subtitle}] -> ${rohanPerson.url}`);

    // -------------------------------------------------------------
    // Step 4: Testing Invoice Exact Code Search
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Testing Invoice Code Search ---');

    const invoiceSearch = await searchService.searchAll({ q: invoice.invoiceNumber });
    if (invoiceSearch.categories.invoices.length === 0) {
      throw new Error(`Invoice search failed to find '${invoice.invoiceNumber}'`);
    }
    const foundInv = invoiceSearch.categories.invoices[0];
    console.log(`✅ Found Invoice: '${foundInv.title}' (Score: ${foundInv.relevanceScore})`);
    console.log(`   Details: ${foundInv.subtitle} -> ${foundInv.url}`);

    // -------------------------------------------------------------
    // Step 5: Testing Entity Category Filtering
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing Entity Category Filtering ---');

    const filteredSearch = await searchService.searchAll({
      q: 'Enterprise',
      entities: [SearchableEntity.LEADS, SearchableEntity.SERVICES],
    });

    console.log(`✅ Filtered search: Leads: ${filteredSearch.categories.leads.length}, Services: ${filteredSearch.categories.services.length}, Projects: ${filteredSearch.categories.projects.length}`);
    if (filteredSearch.categories.projects.length !== 0) {
      throw new Error('Entity category filter failed: projects should not have been queried.');
    }

    // -------------------------------------------------------------
    // Step 6: Testing Quick Autocomplete Search (Cmd+K)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Testing Quick Autocomplete Search (Cmd+K) ---');

    const quickResults = await searchService.quickSearch({ q: 'Cloud', limit: 5 });
    console.log(`✅ Quick search for 'Cloud' returned ${quickResults.results.length} results:`);
    quickResults.results.forEach((r, idx) => {
      console.log(`   ${idx + 1}. [${r.badge}] ${r.title} (Relevance: ${r.relevanceScore}) -> ${r.url}`);
    });

    if (quickResults.results.length === 0) {
      throw new Error("Quick search failed to find matches for 'Cloud'");
    }

    // -------------------------------------------------------------
    // Step 7: Testing Security Rate Limiting Guard
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Testing Security Rate Limiting Guard ---');

    const rateLimitGuard = new RateLimitGuard(reflector);

    // Mock ExecutionContext for testing
    const createMockContext = (ip: string, email?: string) => {
      const headers: Record<string, string> = { 'x-forwarded-for': ip };
      const responseHeaders: Record<string, any> = {};

      const req: any = {
        headers,
        ip,
        method: 'POST',
        path: '/public/forms/enquiry',
        baseUrl: '/public',
        body: email ? { email } : {},
      };

      const res: any = {
        setHeader: (key: string, value: any) => {
          responseHeaders[key] = value;
        },
      };

      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => res,
        }),
        getHandler: () => () => {},
        getClass: () => class TestController {},
      } as any;

      return { context, responseHeaders };
    };

    // Mock reflector returning rate limit rule: max 3 requests in 10 seconds
    const mockReflector = {
      getAllAndOverride: () => ({
        ttlSeconds: 10,
        maxRequests: 3,
        keyPrefix: 'test_limit',
      }),
    };
    (rateLimitGuard as any).reflector = mockReflector;

    const testIp = `192.168.1.${Math.floor(100 + Math.random() * 100)}`;
    console.log(`Simulating rapid consecutive requests from IP: ${testIp}`);

    // Request 1: allowed
    const req1 = createMockContext(testIp);
    const allowed1 = rateLimitGuard.canActivate(req1.context);
    console.log(`✅ Request 1: Allowed: ${allowed1} (Remaining: ${req1.responseHeaders['X-RateLimit-Remaining']})`);

    // Request 2: allowed
    const req2 = createMockContext(testIp);
    const allowed2 = rateLimitGuard.canActivate(req2.context);
    console.log(`✅ Request 2: Allowed: ${allowed2} (Remaining: ${req2.responseHeaders['X-RateLimit-Remaining']})`);

    // Request 3: allowed (hits limit)
    const req3 = createMockContext(testIp);
    const allowed3 = rateLimitGuard.canActivate(req3.context);
    console.log(`✅ Request 3: Allowed: ${allowed3} (Remaining: ${req3.responseHeaders['X-RateLimit-Remaining']})`);

    // Request 4: BLOCKED with 429 Too Many Requests
    let blockedAsExpected = false;
    try {
      const req4 = createMockContext(testIp);
      rateLimitGuard.canActivate(req4.context);
    } catch (err: any) {
      if (err.getStatus && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        blockedAsExpected = true;
        console.log(`✅ Request 4: Correctly rejected with HTTP 429: "${err.message}" (Retry-After: ${err.getResponse()?.retryAfter}s)`);
      }
    }

    if (!blockedAsExpected) {
      throw new Error('RateLimitGuard failed to block request exceeding maxRequests threshold!');
    }

    // -------------------------------------------------------------
    // Step 8: Cleanup Test Records
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Cleaning up Test Records ---');
    if (cleanupIds.invoiceIds.length > 0) {
      await prisma.invoice.deleteMany({ where: { id: { in: cleanupIds.invoiceIds } } });
    }
    if (cleanupIds.serviceIds.length > 0) {
      await prisma.serviceItem.deleteMany({ where: { id: { in: cleanupIds.serviceIds } } });
    }
    if (cleanupIds.applicationIds.length > 0) {
      await prisma.application.deleteMany({ where: { id: { in: cleanupIds.applicationIds } } });
    }
    if (cleanupIds.jobPostingIds.length > 0) {
      await prisma.jobPosting.deleteMany({ where: { id: { in: cleanupIds.jobPostingIds } } });
    }
    if (cleanupIds.projectIds.length > 0) {
      await prisma.project.deleteMany({ where: { id: { in: cleanupIds.projectIds } } });
    }
    if (cleanupIds.leadIds.length > 0) {
      await prisma.lead.deleteMany({ where: { id: { in: cleanupIds.leadIds } } });
    }
    if (cleanupIds.personIds.length > 0) {
      await prisma.person.deleteMany({ where: { id: { in: cleanupIds.personIds } } });
    }
    if (cleanupIds.staffIds.length > 0) {
      await prisma.staff.deleteMany({ where: { id: { in: cleanupIds.staffIds } } });
    }
    console.log('✅ Cleaned up all test records across all entities.');

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 9 (GLOBAL SEARCH & ABUSE RATE LIMITING) TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error: any) {
    console.error('\n❌ Phase 9 Verification failed with error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

runPhase9Verification().catch(() => process.exit(1));

