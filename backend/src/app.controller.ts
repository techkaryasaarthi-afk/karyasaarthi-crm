import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System & Health')
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
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service uptime and system status' })
  getHealth() {
    return this.appService.getHealthStatus();
  }
}
