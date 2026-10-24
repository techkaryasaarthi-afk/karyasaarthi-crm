// @ts-nocheck
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Seeding initial data...');
}
main().finally(() => prisma.$disconnect());
