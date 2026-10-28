import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AutomationService } from './automation.service';
import { TriggerAutomationDto } from './dto/automation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Automation Engine & SLA Auto-Escalation')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('trigger')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Trigger CRM automation cycle',
    description: 'Executes automated 15-minute SLA breach escalation, stale lead follow-up task generation, and overdue invoice status tracking.',
  })
  @ApiResponse({ status: 200, description: 'Automation cycle execution metrics' })
  trigger(@Body() dto: TriggerAutomationDto) {
    if (dto.triggerType === 'SLA_CHECK') {
      return this.automationService.escalateSlaBreaches();
    }
    if (dto.triggerType === 'STALE_LEADS') {
      return this.automationService.checkStaleLeads();
    }
    if (dto.triggerType === 'OVERDUE_INVOICES') {
      return this.automationService.checkOverdueInvoices();
    }
    return this.automationService.runAllAutomations();
  }

  @Get('status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get automation rules execution status' })
  @ApiResponse({ status: 200, description: 'Automation rules status' })
  getStatus() {
    return {
      activeRules: [
        {
          name: '15-Minute Omnichannel SLA Breach Escalation',
          trigger: 'Periodic Check',
          action: 'Escalate conversation, alert Admin/Manager via in-app notification',
          enabled: true,
        },
        {
          name: '48-Hour Stale Lead Follow-up Reminder',
          trigger: 'Periodic Check',
          action: 'Create LeadTask and notify assigned staff',
          enabled: true,
        },
        {
          name: 'Overdue Invoice Monitor',
          trigger: 'Periodic Check',
          action: 'Mark Invoice OVERDUE and dispatch accounting alert',
          enabled: true,
        },
      ],
    };
  }
}
