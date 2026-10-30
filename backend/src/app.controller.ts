import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { Roles } from './common/decorators/roles.decorator';
import { RolesGuard } from './common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('System, Health & Backup Verification')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API Root & Information' })
  @ApiResponse({ status: 200, description: 'API status and basic details' })
  getRoot() {
    return this.appService.getRootInfo();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Deep Production Health Check' })
  @ApiResponse({ status: 200, description: 'Service uptime, database latency, and system memory status' })
  getHealth() {
    return this.appService.getHealthStatus();
  }

  @Post('health/backup-drill')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Trigger Automated Database Backup & Snapshot Verification Drill',
    description: 'Executes verified database backup drill across all tables and validates data restorability per blueprint go-live checklist',
  })
  @ApiResponse({ status: 200, description: 'Snapshot verification manifest' })
  triggerBackupDrill(@Req() req: any) {
    return this.appService.triggerBackupDrill(req.user?.id);
  }
}
