import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getRootInfo() {
    return {
      name: 'Karya Saarthi CRM Core API',
      version: '1.0.0',
      status: 'active',
      documentation: '/api/docs',
      surfacesSupported: [
        'karyasaarthi.com',
        'karyasaarthi.in',
        'career.karyasaarthi.com',
        'Mobile App (iOS/Android)',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  async getHealthStatus() {
    let databaseStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'unreachable';
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      database: databaseStatus,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
