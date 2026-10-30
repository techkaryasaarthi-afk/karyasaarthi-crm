import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AppService } from '../src/app.service';
import { SearchService } from '../src/modules/search/search.service';
import { AdminControlService } from '../src/modules/admin-control/admin-control.service';
import { Surface, PricingModel, Role } from '@prisma/client';

async function runLoadSimulation() {
  console.log('\n========================================================================');
  console.log('⚡ KARYA SAARTHI UNIFIED CRM — PEAK CONCURRENT LOAD SIMULATION');
  console.log('   (Benchmarking Multi-Surface Concurrency, Latency & Pool Stability)');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const appService = app.get(AppService);
  const searchService = app.get(SearchService);
  const adminControlService = app.get(AdminControlService);

  const cleanupServiceIds: string[] = [];
  const cleanupStaffIds: string[] = [];
  const ts = Date.now();

  try {
    const admin = await prisma.staff.create({
      data: {
        name: 'Benchmark Admin',
        email: `bench.admin.${ts}@karyasaarthi.com`,
        passwordHash: 'dummyhash123',
        role: Role.ADMIN,
        active: true,
      },
    });
    cleanupStaffIds.push(admin.id);

    // Setup test service item
    const benchmarkItem = await adminControlService.createService(
      {
        title: 'High-Volume Concurrency Benchmark Service',
        slug: `high-volume-benchmark-${ts}`,
        description: 'Service item used for concurrent query stress testing',
        category: 'ENTERPRISE_DEV',
        basePrice: 100000,
        pricingModel: PricingModel.FIXED,
        deliverables: ['Automated benchmarking', 'Concurrent query stress test'],
        surfaces: [Surface.SITE_COM, Surface.SITE_IN, Surface.APP],
        active: true,
      },
      admin.id,
    );
    cleanupServiceIds.push(benchmarkItem.id);

    const CONCURRENT_WORKERS = 15;
    const OPERATIONS_PER_WORKER = 2;
    const TOTAL_OPERATIONS = CONCURRENT_WORKERS * OPERATIONS_PER_WORKER;

    console.log(`🚀 Launching ${TOTAL_OPERATIONS} operations across ${CONCURRENT_WORKERS} concurrent async workers...`);
    console.log(`   Targets: Deep Health Check, Global Search Engine, and Dynamic Pricing Engine\n`);

    const latencies: number[] = [];
    const startTime = Date.now();

    const workerTasks = Array.from({ length: CONCURRENT_WORKERS }).map(async (_, workerIdx) => {
      for (let i = 0; i < OPERATIONS_PER_WORKER; i++) {
        const opStart = Date.now();
        const opType = (workerIdx + i) % 3;

        if (opType === 0) {
          // Operation 1: Deep Health Check (DB Ping + Table Count)
          await appService.getHealthStatus();
        } else if (opType === 1) {
          // Operation 2: Quick Search Omnibar Autocomplete
          await searchService.quickSearch({ q: 'CRM' });
        } else {
          // Operation 3: Dynamic Price Calculation
          await adminControlService.calculateDynamicQuote({
            serviceIdentifier: benchmarkItem.id,
            surface: Surface.SITE_COM,
          });
        }

        const duration = Date.now() - opStart;
        latencies.push(duration);
      }
    });

    await Promise.all(workerTasks);
    const totalDuration = Date.now() - startTime;

    // Calculate metrics
    latencies.sort((a, b) => a - b);
    const minLatency = latencies[0];
    const maxLatency = latencies[latencies.length - 1];
    const avgLatency = Math.round(latencies.reduce((acc, curr) => acc + curr, 0) / latencies.length);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const throughput = Math.round((TOTAL_OPERATIONS / (totalDuration / 1000)) * 10) / 10;

    console.log('------------------------------------------------------------------------');
    console.log('📊 CONCURRENCY & LATENCY BENCHMARK RESULTS:');
    console.log(`   - Total Operations Executed: ${TOTAL_OPERATIONS}`);
    console.log(`   - Total Elapsed Time:       ${totalDuration} ms`);
    console.log(`   - System Throughput:         ${throughput} operations / sec`);
    console.log(`   - Min Latency:               ${minLatency} ms`);
    console.log(`   - Average Latency:           ${avgLatency} ms`);
    console.log(`   - Median (p50) Latency:      ${p50} ms`);
    console.log(`   - 95th Percentile (p95):     ${p95} ms`);
    console.log(`   - Max Latency:               ${maxLatency} ms`);
    console.log('------------------------------------------------------------------------');

    if (p95 < 15000) {
      console.log('✅ Connection Pool & Query Stability: PASSED within acceptable bounds.\n');
    } else {
      console.warn('⚠️ Warning: p95 latency higher than nominal expected bounds.');
    }

    console.log('========================================================================');
    console.log('🎉 LOAD SIMULATION COMPLETED SUCCESSFULLY WITH 0 FAILURES!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ LOAD SIMULATION FAILED:', error);
    throw error;
  } finally {
    if (cleanupServiceIds.length) {
      await prisma.serviceItem.deleteMany({ where: { id: { in: cleanupServiceIds } } });
    }
    if (cleanupStaffIds.length) {
      await prisma.auditLog.deleteMany({ where: { actorId: { in: cleanupStaffIds } } });
      await prisma.staff.deleteMany({ where: { id: { in: cleanupStaffIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  }
}

runLoadSimulation().catch(() => process.exit(1));
