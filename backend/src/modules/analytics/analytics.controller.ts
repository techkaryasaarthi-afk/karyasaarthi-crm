import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Unified Executive Analytics & KPIs')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Executive Master KPI Dashboard',
    description: 'Aggregates live revenue, sales funnel, delivery rate, 15-min SLA compliance, vendor capacity, and cross-surface traffic distribution.',
  })
  @ApiResponse({ status: 200, description: 'Unified executive dashboard metrics' })
  async getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getExecutiveDashboardOverview(query);
  }

  @Get('revenue')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Revenue, collections, and receivables breakdown' })
  @ApiResponse({ status: 200, description: 'Revenue metrics' })
  async getRevenue(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getExecutiveDashboardOverview(query);
    return data.revenue;
  }

  @Get('funnel')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Sales pipeline stage conversion funnel' })
  @ApiResponse({ status: 200, description: 'Sales funnel metrics' })
  async getFunnel(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getExecutiveDashboardOverview(query);
    return data.salesPipeline;
  }

  @Get('surface-traffic')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cross-surface touchpoint distribution across domains' })
  @ApiResponse({ status: 200, description: 'Surface traffic breakdown' })
  async getSurfaceTraffic(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getExecutiveDashboardOverview(query);
    return data.surfaceTraffic;
  }
}
