// @ts-nocheck
import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Module({
  imports: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
