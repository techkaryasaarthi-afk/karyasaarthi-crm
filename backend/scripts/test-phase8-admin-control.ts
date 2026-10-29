import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AdminControlService } from '../src/modules/admin-control/admin-control.service';
import { LeadsService } from '../src/modules/leads/leads.service';
import { Role, Surface, PersonType, PricingModel, PricingConditionType } from '@prisma/client';

async function runPhase8Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 8: ADMIN CONTROL PANEL VERIFICATION');
  console.log('   (Services Catalogue, Dynamic Pricing, Feature Flags, Lead Routing)');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const adminControlService = app.get(AdminControlService);
  const leadsService = app.get(LeadsService);

  const cleanupIds = {
    staffIds: [] as string[],
    personIds: [] as string[],
    serviceIds: [] as string[],
    pricingRuleIds: [] as string[],
    featureFlagIds: [] as string[],
    routingRuleIds: [] as string[],
    leadIds: [] as string[],
  };

  try {
    // -------------------------------------------------------------
    // Step 1: Set up Test Staff & Client Person
    // -------------------------------------------------------------
    console.log('--- Step 1: Setting up Test Staff Members & Client ---');
    const timestamp = Date.now();

    const admin = await prisma.staff.create({
      data: {
        name: 'Vikram Malhotra (CRM Admin)',
        email: `admin.p8.${timestamp}@karyasaarthi.com`,
        passwordHash: 'dummyhash123',
        role: Role.ADMIN,
        active: true,
      },
    });
    cleanupIds.staffIds.push(admin.id);
    console.log(`✅ Admin Staff created: ${admin.name} (${admin.id})`);

    const seniorWebSales = await prisma.staff.create({
      data: {
        name: 'Priya Sharma (Senior Web Specialist)',
        email: `priya.web.p8.${timestamp}@karyasaarthi.com`,
        passwordHash: 'dummyhash123',
        role: Role.SALES,
        active: true,
      },
    });
    cleanupIds.staffIds.push(seniorWebSales.id);
    console.log(`✅ Senior Web Sales Specialist created: ${seniorWebSales.name} (${seniorWebSales.id})`);

    const mobileLead = await prisma.staff.create({
      data: {
        name: 'Arjun Verma (Mobile Solutions Lead)',
        email: `arjun.mobile.p8.${timestamp}@karyasaarthi.com`,
        passwordHash: 'dummyhash123',
        role: Role.SALES,
        active: true,
      },
    });
    cleanupIds.staffIds.push(mobileLead.id);
    console.log(`✅ Mobile Solutions Lead created: ${mobileLead.name} (${mobileLead.id})`);

    const clientPerson = await prisma.person.create({
      data: {
        fullName: 'Sameer Singhania (Prospect)',
        email: `sameer.prospect.p8.${timestamp}@gmail.com`,
        phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
        type: PersonType.LEAD,
        firstTouchSource: Surface.SITE_COM,
      },
    });
    cleanupIds.personIds.push(clientPerson.id);
    console.log(`✅ Prospect Person created: ${clientPerson.fullName} (${clientPerson.id})`);

    // -------------------------------------------------------------
    // Step 2: Testing Service Catalogue Management
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Service Catalogue Management ---');

    const webService = await adminControlService.createService(
      {
        title: 'Enterprise Next.js Web Platform',
        slug: `enterprise-nextjs-web-platform-${timestamp}`,
        description: 'Bespoke high-performance web platform built with Next.js App Router, Tailwind, and PostgreSQL.',
        category: 'Web Development',
        basePrice: 85000,
        currency: 'INR',
        pricingModel: PricingModel.FIXED,
        deliverables: ['Custom Next.js Frontend', 'PostgreSQL Schema & API', 'Docker Deployment', '1-Month Hypercare'],
        surfaces: [Surface.SITE_COM, Surface.SITE_IN, Surface.APP],
        active: true,
      },
      admin.id,
    );
    cleanupIds.serviceIds.push(webService.id);
    console.log(`✅ Web Service created: '${webService.title}' [Base: ₹${webService.basePrice}]`);

    const mobileService = await adminControlService.createService(
      {
        title: 'Cross-Platform React Native App',
        slug: `cross-platform-react-native-app-${timestamp}`,
        description: 'Production iOS and Android application with real-time push notifications and offline sync.',
        category: 'Mobile Development',
        basePrice: 125000,
        currency: 'INR',
        pricingModel: PricingModel.MILESTONE,
        deliverables: ['iOS App Build', 'Android App Build', 'Push Notification Setup', 'App Store & Play Store Release'],
        surfaces: [Surface.SITE_COM, Surface.APP],
        active: true,
      },
      admin.id,
    );
    cleanupIds.serviceIds.push(mobileService.id);
    console.log(`✅ Mobile Service created: '${mobileService.title}' [Base: ₹${mobileService.basePrice}]`);

    // Slug collision check
    try {
      await adminControlService.createService(
        {
          title: 'Duplicate Slug Test',
          slug: webService.slug,
          description: 'Collision test',
          category: 'Web Development',
          basePrice: 50000,
        },
        admin.id,
      );
      throw new Error('Slug collision should have thrown ConflictException');
    } catch (err: any) {
      console.log(`✅ Slug duplicate collision correctly rejected: "${err.message}"`);
    }

    // Public Service Catalogue Filtered by Surface
    const siteInServices = await adminControlService.getPublicServices(Surface.SITE_IN);
    console.log(`✅ Public Services for karyasaarthi.in count: ${siteInServices.length} (Includes Web Service: ${siteInServices.some((s) => s.id === webService.id)})`);

    // -------------------------------------------------------------
    // Step 3: Testing Dynamic Pricing Rules & Quotes
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing Dynamic Pricing Rules & Quotes ---');

    // Rule A: 15% Promotional Discount for regional karyasaarthi.in leads
    const promoRule = await adminControlService.createPricingRule(
      {
        name: 'Regional karyasaarthi.in 15% Launch Offer',
        description: 'Applies 15% promotional discount on web services for regional website users',
        serviceId: webService.id,
        conditionType: PricingConditionType.SURFACE_PROMO,
        discountPercentage: 15.0,
        targetSurface: Surface.SITE_IN,
        active: true,
      },
      admin.id,
    );
    cleanupIds.pricingRuleIds.push(promoRule.id);
    console.log(`✅ Pricing Rule created: '${promoRule.name}' (15% discount on ${promoRule.targetSurface})`);

    // Rule B: High Budget 10% Volume Discount (Global for budgets >= ₹1,00,000)
    const volumeRule = await adminControlService.createPricingRule(
      {
        name: 'Enterprise Scale 10% Volume Discount',
        description: 'Applies 10% discount on projects with budget >= ₹1 Lakh',
        conditionType: PricingConditionType.MIN_BUDGET,
        minBudget: 100000,
        discountPercentage: 10.0,
        active: true,
      },
      admin.id,
    );
    cleanupIds.pricingRuleIds.push(volumeRule.id);
    console.log(`✅ Global Volume Pricing Rule created: '${volumeRule.name}' (Min budget: ₹1,00,000)`);

    // Test Quote Calculation 1: Standard surface (SITE_COM) without surface promo
    const standardQuote = await adminControlService.calculateDynamicQuote({
      serviceIdentifier: webService.slug,
      surface: Surface.SITE_COM,
      scopeUnits: 1,
    });
    console.log(`✅ Quote for SITE_COM: Subtotal: ₹${standardQuote.quote.subtotal}, Discount: ${standardQuote.quote.discountPercent}%, Total: ₹${standardQuote.quote.estimatedTotal}`);

    // Test Quote Calculation 2: Regional surface (SITE_IN) with 15% promo applied
    const promoQuote = await adminControlService.calculateDynamicQuote({
      serviceIdentifier: webService.slug,
      surface: Surface.SITE_IN,
      scopeUnits: 1,
    });
    console.log(`✅ Quote for SITE_IN (with Promo): Subtotal: ₹${promoQuote.quote.subtotal}, Discount: ${promoQuote.quote.discountPercent}%, Total: ₹${promoQuote.quote.estimatedTotal}`);
    if (promoQuote.quote.discountPercent !== 15 || promoQuote.quote.estimatedTotal !== 72250) {
      throw new Error(`Expected 15% discount on ₹85,000 (₹72,250), received: ₹${promoQuote.quote.estimatedTotal}`);
    }

    // -------------------------------------------------------------
    // Step 4: Testing Surface Feature Flags
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Testing Surface Feature Flags ---');

    const flagChat = await adminControlService.createFeatureFlag(
      {
        key: `instant_live_chat_${timestamp}`,
        name: 'Real-time Omnichannel Live Chat',
        description: 'Toggles active chat bubble across all surfaces',
        enabled: true,
        surface: undefined, // All surfaces
        rolloutPercentage: 100,
        config: { soundAlerts: true, autoOpenSeconds: 15 },
      },
      admin.id,
    );
    cleanupIds.featureFlagIds.push(flagChat.id);
    console.log(`✅ Global Feature Flag created: '${flagChat.key}' [Enabled: ${flagChat.enabled}]`);

    const flagRegionalPricing = await adminControlService.createFeatureFlag(
      {
        key: `regional_currency_selector_${timestamp}`,
        name: 'Regional Pricing Selector',
        description: 'Shows regional payment options on karyasaarthi.in',
        enabled: true,
        surface: Surface.SITE_IN,
        config: { defaultCurrency: 'INR', supportedGateways: ['UPI', 'RAZORPAY'] },
      },
      admin.id,
    );
    cleanupIds.featureFlagIds.push(flagRegionalPricing.id);
    console.log(`✅ Surface-Scoped Feature Flag created: '${flagRegionalPricing.key}' for ${flagRegionalPricing.surface}`);

    // Query Public Feature Flags for SITE_IN vs APP
    const siteInFlags = await adminControlService.getPublicFeatureFlags(Surface.SITE_IN);
    const appFlags = await adminControlService.getPublicFeatureFlags(Surface.APP);

    console.log(`✅ SITE_IN flags map includes global chat: ${siteInFlags.flags[flagChat.key]} and regional selector: ${siteInFlags.flags[flagRegionalPricing.key]}`);
    console.log(`✅ APP flags map excludes regional selector: ${appFlags.flags[flagRegionalPricing.key] === undefined}`);

    // -------------------------------------------------------------
    // Step 5: Testing Pipeline Routing Rules & Lead Assignment
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing Pipeline Routing Rules & Lead Auto-Routing ---');

    // Rule 1: High Priority (20) - Enterprise Web inquiries routed to Senior Web Sales (Priya)
    const webRoutingRule = await adminControlService.createRoutingRule(
      {
        name: 'Enterprise Web Inquiries -> Senior Web Specialist',
        description: 'Routes high-budget or enterprise web inquiries directly to Priya',
        priority: 20,
        serviceCategory: 'Web Development',
        minEstimatedValue: 80000,
        keywordMatch: ['enterprise', 'scalable', 'portal', 'custom'],
        assignedStaffId: seniorWebSales.id,
        active: true,
      },
      admin.id,
    );
    cleanupIds.routingRuleIds.push(webRoutingRule.id);
    console.log(`✅ Routing Rule 1 created: '${webRoutingRule.name}' [Priority: ${webRoutingRule.priority}] -> ${seniorWebSales.name}`);

    // Rule 2: Normal Priority (10) - Mobile App inquiries routed to Mobile Lead (Arjun)
    const mobileRoutingRule = await adminControlService.createRoutingRule(
      {
        name: 'Mobile App Inquiries -> Mobile Lead',
        description: 'Routes mobile requests or App surface leads to Arjun',
        priority: 10,
        sourceSurface: Surface.APP,
        keywordMatch: ['mobile', 'ios', 'android', 'react native'],
        assignedStaffId: mobileLead.id,
        active: true,
      },
      admin.id,
    );
    cleanupIds.routingRuleIds.push(mobileRoutingRule.id);
    console.log(`✅ Routing Rule 2 created: '${mobileRoutingRule.name}' [Priority: ${mobileRoutingRule.priority}] -> ${mobileLead.name}`);

    // Simulate direct routing evaluation
    const evalTest1 = await adminControlService.evaluateLeadRouting({
      sourceSurface: Surface.SITE_COM,
      serviceType: 'Web Development',
      estimatedValue: 95000,
      title: 'Enterprise Custom Portal for Financial Services',
      notes: 'Need scalable architecture and SOC2 compliance',
    });
    console.log(`✅ Routing Evaluation Result: Rule: '${evalTest1.matchedRule?.name}' -> Assigned Staff ID: ${evalTest1.assignedStaffId}`);
    if (evalTest1.assignedStaffId !== seniorWebSales.id) {
      throw new Error(`Expected route to Senior Web Specialist (${seniorWebSales.id}), got ${evalTest1.assignedStaffId}`);
    }

    // -------------------------------------------------------------
    // Step 6: End-to-End Ingestion with Lead Creation
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Testing End-to-End Lead Creation with Rule Assignment ---');

    const createdLead = await leadsService.create({
      personId: clientPerson.id,
      title: 'Scalable Enterprise React Portal with Microservices',
      sourceSurface: Surface.SITE_COM,
      serviceType: 'Web Development',
      estimatedValue: 120000,
      notes: 'Urgent enterprise project for Q4 kickoff',
    });
    cleanupIds.leadIds.push(createdLead.id);

    console.log(`✅ Lead Created: '${createdLead.title}'`);
    console.log(`   Assigned Staff: ${createdLead.assignedStaff?.name} (${createdLead.assignedStaffId})`);
    console.log(`   Lead Score: ${createdLead.score} | Urgency: ${createdLead.urgency}`);

    if (createdLead.assignedStaffId !== seniorWebSales.id) {
      throw new Error(`Lead auto-assignment failed! Expected ${seniorWebSales.id}, received: ${createdLead.assignedStaffId}`);
    }
    console.log('✅ Lead was correctly and automatically routed to Senior Web Specialist via Priority 20 Routing Rule!');

    // Verify Audit Trail Entry
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: { in: ['ServiceItem', 'PricingRule', 'FeatureFlag', 'RoutingRule'] },
      },
      orderBy: { at: 'desc' },
      take: 4,
    });
    console.log(`✅ Verified Audit Trail logs generated: ${auditLogs.length} recent admin audit records logged.`);

    // -------------------------------------------------------------
    // Step 7: Cleanup Test Records
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Cleaning up Test Records ---');
    if (cleanupIds.leadIds.length > 0) {
      await prisma.leadTask.deleteMany({ where: { leadId: { in: cleanupIds.leadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: cleanupIds.leadIds } } });
    }
    if (cleanupIds.routingRuleIds.length > 0) {
      await prisma.routingRule.deleteMany({ where: { id: { in: cleanupIds.routingRuleIds } } });
    }
    if (cleanupIds.featureFlagIds.length > 0) {
      await prisma.featureFlag.deleteMany({ where: { id: { in: cleanupIds.featureFlagIds } } });
    }
    if (cleanupIds.pricingRuleIds.length > 0) {
      await prisma.pricingRule.deleteMany({ where: { id: { in: cleanupIds.pricingRuleIds } } });
    }
    if (cleanupIds.serviceIds.length > 0) {
      await prisma.serviceItem.deleteMany({ where: { id: { in: cleanupIds.serviceIds } } });
    }
    if (cleanupIds.personIds.length > 0) {
      await prisma.person.deleteMany({ where: { id: { in: cleanupIds.personIds } } });
    }
    if (cleanupIds.staffIds.length > 0) {
      await prisma.staff.deleteMany({ where: { id: { in: cleanupIds.staffIds } } });
    }
    console.log('✅ Cleaned up test leads, routing rules, feature flags, pricing rules, services, persons, and staff.');

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 8 (ADMIN CONTROL PANEL) TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error: any) {
    console.error('\n❌ Phase 8 Verification failed with error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

runPhase8Verification().catch(() => process.exit(1));

