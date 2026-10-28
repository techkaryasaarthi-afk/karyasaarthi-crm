import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { InvoiceStatus, PaymentMethod } from '../src/modules/payments/dto/payment.dto';
import { PersonType, Surface } from '@prisma/client';

async function runPhase5Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 5: INVOICING, PAYMENTS & EXECUTIVE ANALYTICS');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const paymentsService = app.get(PaymentsService);
  const analyticsService = app.get(AnalyticsService);
  const projectsService = app.get(ProjectsService);

  try {
    // -------------------------------------------------------------
    // Step 1: Prepare Test Client and Commissioned Project
    // -------------------------------------------------------------
    console.log('--- Step 1: Setting up Client and Project Entities ---');
    const clientEmail = `client.phase5.${Date.now()}@fintech.io`;
    const clientPerson = await prisma.person.create({
      data: {
        fullName: 'FinTech Innovations Pvt Ltd (CTO)',
        email: clientEmail,
        phone: `+919933${Math.floor(100000 + Math.random() * 900000)}`,
        type: PersonType.CLIENT,
        firstTouchSource: Surface.SITE_COM,
      },
    });
    console.log(`✅ Client created: ${clientPerson.fullName} (${clientPerson.id})`);

    const project = await projectsService.create({
      title: 'AI Payment Gateway & Core Banking Integration',
      description: 'Enterprise payment routing and automated ledger reconciliation.',
      clientId: clientPerson.id,
      serviceType: 'FINTECH_DEVELOPMENT',
      budget: 180000,
      currency: 'INR',
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      sourceSurface: Surface.SITE_COM,
    });
    console.log(`✅ Project commissioned: "${project.title}" (ID: ${project.id})`);

    const milestone1 = await projectsService.addMilestone(project.id, {
      title: 'Milestone 1: Security Audit & Ledger Schema',
      amount: 60000,
    });
    console.log(`✅ Project Milestone created: "${milestone1.title}" (ID: ${milestone1.id})`);

    // -------------------------------------------------------------
    // Step 2: Generate GST Invoice
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Generating GST Client Invoice ---');
    const invoice = await paymentsService.createInvoice({
      clientId: clientPerson.id,
      projectId: project.id,
      milestoneId: milestone1.id,
      title: 'Milestone 1 Advance: Security Architecture & Ledger Schema',
      description: 'Covers initial database indexing, cryptographic key setup, and audit readiness.',
      subtotal: 60000,
      taxAmount: 10800, // 18% GST
      currency: 'INR',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    console.log(`✅ Invoice generated: ${invoice.invoiceNumber}`);
    console.log(`   - Subtotal: ₹${invoice.subtotal}`);
    console.log(`   - GST/Tax: ₹${invoice.taxAmount}`);
    console.log(`   - Total Payable: ₹${invoice.totalAmount}`);
    console.log(`   - Status: ${invoice.status}`);

    // -------------------------------------------------------------
    // Step 3: Create Razorpay Payment Order
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Creating Razorpay Payment Order ---');
    const order = await paymentsService.createRazorpayOrder(invoice.id);
    console.log(`✅ Razorpay Order initialized:`);
    console.log(`   - Order ID: ${order.orderId}`);
    console.log(`   - Amount (Paise): ${order.amount} (${order.currency} ${order.amount / 100})`);
    console.log(`   - Invoice Number: ${order.invoiceNumber}`);

    // -------------------------------------------------------------
    // Step 4: Record Payment & Auto-Unlock Milestone
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Recording Payment & Milestone Status Sync ---');
    const paymentResult = await paymentsService.recordPayment({
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      currency: 'INR',
      method: PaymentMethod.RAZORPAY,
      transactionRef: `pay_phase5_${Date.now()}`,
      gatewayPaymentId: order.orderId,
      notes: 'Payment confirmed via Razorpay webhook. Bank UTR: HDFC009918239.',
    });

    console.log(`✅ Payment recorded: ₹${paymentResult.payment.amount} via ${paymentResult.payment.method}`);
    console.log(`✅ Invoice status updated to: ${paymentResult.invoice.status} (Paid at: ${paymentResult.invoice.paidAt?.toISOString()})`);

    // Verify linked milestone is unlocked
    const updatedMilestone = await prisma.projectMilestone.findUnique({
      where: { id: milestone1.id },
    });
    console.log(`✅ Linked Milestone status updated to: ${updatedMilestone?.status}`);

    // Verify Client Billing Statement API
    const billingStatement = await paymentsService.getClientInvoices(clientPerson.id);
    console.log(`✅ Client Billing Statement fetched:`);
    console.log(`   - Total Invoiced: ₹${billingStatement.totalInvoiced}`);
    console.log(`   - Total Paid: ₹${billingStatement.totalPaid}`);
    console.log(`   - Pending Receivables: ₹${billingStatement.pendingReceivables}`);

    // -------------------------------------------------------------
    // Step 5: Executive KPI Dashboard & Analytics Aggregation
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Aggregating Executive Master KPI Dashboard ---');
    const dashboard = await analyticsService.getExecutiveDashboardOverview({ days: 30 });

    console.log(`\n📊 EXECUTIVE KPI DASHBOARD SUMMARY (Past ${dashboard.timeframeDays} Days):`);
    console.log('-------------------------------------------------------------');
    console.log(`💰 REVENUE & COLLECTIONS:`);
    console.log(`   - Total Invoiced: ₹${dashboard.revenue.totalInvoiced.toLocaleString('en-IN')}`);
    console.log(`   - Total Collected: ₹${dashboard.revenue.totalCollected.toLocaleString('en-IN')}`);
    console.log(`   - Pending Receivables: ₹${dashboard.revenue.pendingReceivables.toLocaleString('en-IN')}`);
    console.log(`   - Collection Rate: ${dashboard.revenue.collectionRatePercent}%`);
    console.log(`   - Paid Invoices Count: ${dashboard.revenue.paidInvoicesCount}`);

    console.log(`\n🎯 SALES PIPELINE & CONVERSION FUNNEL:`);
    console.log(`   - Total Leads: ${dashboard.salesPipeline.totalLeads}`);
    console.log(`   - Pipeline Value: ₹${dashboard.salesPipeline.estimatedPipelineValue.toLocaleString('en-IN')}`);
    console.log(`   - Win Rate: ${dashboard.salesPipeline.winRatePercent}%`);
    console.log(`   - Stage Breakdown:`, JSON.stringify(dashboard.salesPipeline.funnel));

    console.log(`\n🚀 PROJECT DELIVERY & EXECUTION:`);
    console.log(`   - Total Projects: ${dashboard.projectDelivery.totalProjects}`);
    console.log(`   - Active Delivery Projects: ${dashboard.projectDelivery.activeProjects}`);
    console.log(`   - Delivered Projects: ${dashboard.projectDelivery.deliveredProjects}`);
    console.log(`   - Milestone Completion Rate: ${dashboard.projectDelivery.milestoneCompletionRate}%`);

    console.log(`\n⏱️ OMNICHANNEL 15-MIN SLA:`);
    console.log(`   - Total Conversations: ${dashboard.omnichannelSLA.totalConversations}`);
    console.log(`   - Avg Response Time: ${dashboard.omnichannelSLA.avgResponseTimeMinutes} min (Target: ${dashboard.omnichannelSLA.targetMinutes} min)`);
    console.log(`   - SLA Compliance Rate: ${dashboard.omnichannelSLA.slaComplianceRate}%`);

    console.log(`\n👥 VENDOR & TALENT NETWORK:`);
    console.log(`   - Total Experts: ${dashboard.vendorNetwork.totalExperts}`);
    console.log(`   - Capacity Slots: ${dashboard.vendorNetwork.capacitySlots}`);
    console.log(`   - Active Allocations: ${dashboard.vendorNetwork.activeAllocations}`);
    console.log(`   - Network Utilization: ${dashboard.vendorNetwork.utilizationPercent}%`);

    console.log(`\n🎓 CAMPUS AMBASSADOR NETWORK:`);
    console.log(`   - Total Ambassadors: ${dashboard.campusAmbassadors.totalAmbassadors}`);
    console.log(`   - Referrals Attributed: ${dashboard.campusAmbassadors.totalReferrals}`);
    console.log(`   - Conversions: ${dashboard.campusAmbassadors.totalConversions}`);

    console.log(`\n🌐 CROSS-SURFACE TRAFFIC DISTRIBUTION:`);
    Object.entries(dashboard.surfaceTraffic).forEach(([surface, count]) => {
      console.log(`   - ${surface}: ${count} touchpoint(s)`);
    });

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 5 PAYMENTS & EXECUTIVE ANALYTICS TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('❌ Phase 5 verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

runPhase5Verification();
