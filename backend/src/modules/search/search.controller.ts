import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SearchService } from './search.service';
import { GlobalSearchQueryDto, QuickSearchQueryDto } from './dto/search.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Unified Global Search')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Global Cross-Entity Search',
    description: 'Searches across leads, projects, job applications, persons, services, invoices, and staff with relevance scoring',
  })
  @ApiResponse({ status: 200, description: 'Categorized and ranked search results' })
  searchAll(@Query() query: GlobalSearchQueryDto) {
    return this.searchService.searchAll(query);
  }

  @Get('quick')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Quick Autocomplete Search (Cmd+K)',
    description: 'Ultra-fast quick jump search across CRM records for omnibar navigation',
  })
  @ApiResponse({ status: 200, description: 'Top quick search matches' })
  quickSearch(@Query() query: QuickSearchQueryDto) {
    return this.searchService.quickSearch(query);
  }
}
