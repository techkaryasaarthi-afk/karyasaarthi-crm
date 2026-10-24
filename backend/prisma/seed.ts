import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Karya Saarthi CRM...');

  const adminEmail = 'admin@karyasaarthi.com';
  const defaultPassword = 'AdminPassword123!';

  // Check if default admin already exists
  const existingAdmin = await prisma.staff.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    const admin = await prisma.staff.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        passwordHash,
        role: Role.ADMIN,
        active: true,
      },
    });

    console.log(`✅ Default Super Admin created: ${admin.email}`);
    console.log(`🔑 Initial Password: ${defaultPassword} (Please change in production)`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${existingAdmin.email}`);
  }

  // Check sample Job Posting
  const existingJob = await prisma.jobPosting.findFirst();
  if (!existingJob) {
    await prisma.jobPosting.create({
      data: {
        title: 'Full Stack Engineer (NestJS / Next.js)',
        open: true,
      },
    });
    console.log('✅ Sample Job Posting created');
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
