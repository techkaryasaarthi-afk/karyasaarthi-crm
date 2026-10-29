import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, Surface } from '@prisma/client';
import { AdminControlService } from './admin-control.service';
import {
  CreateServiceItemDto,
  UpdateServiceItemDto,
  QueryServiceItemDto,
  CalculateQuoteDto,
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  QueryPricingRuleDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  QueryFeatureFlagDto,
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
  QueryRoutingRuleDto,
  EvaluateLeadRoutingDto,
} from './dto/admin-control.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Admin Control Panel (Services, Pricing, Feature Flags, Lead Routing)')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('admin-control')
export class AdminControlController {
  constructor(private readonly adminControlService: AdminControlService) {}

  // ==========================================
  // PUBLIC SURFACE INTEGRATION ENDPOINTS
  // ==========================================

  @Public()
  @Get('public/services')
  @ApiOperation({
    summary: 'Public Service Catalogue',
    description: 'Returns active services and applicable pricing models for karyasaarthi.com, karyasaarthi.in, or mobile app',
  })
  @ApiResponse({ status: 200, description: 'Active services list' })
  getPublicServices(@Query('surface') surface?: Surface) {
    return this.adminControlService.getPublicServices(surface);
  }

  @Public()
  @Get('public/feature-flags')
  @ApiOperation({
    summary: 'Public Surface Feature Flags',
    description: 'Returns enabled feature flags and rollout parameters for the calling surface',
  })
  @ApiResponse({ status: 200, description: 'Active feature flags map' })
  getPublicFeatureFlags(@Query('surface') surface?: Surface) {
    return this.adminControlService.getPublicFeatureFlags(surface);
  }

  @Public()
  @Post('public/quote')
  @ApiOperation({
    summary: 'Calculate Dynamic Service Quote',
    description: 'Calculates dynamic price with scope units, volume discounts, and surface promotional rules applied',
  })
  @ApiResponse({ status: 200, description: 'Detailed price quote breakdown' })
  calculatePublicQuote(@Body() dto: CalculateQuoteDto) {
    return this.adminControlService.calculateDynamicQuote(dto);
  }

  // ==========================================
  // SERVICE CATALOGUE MANAGEMENT (ADMIN/MANAGER)
  // ==========================================

  @Post('services')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create service item in catalogue' })
  @ApiResponse({ status: 201, description: 'Service item created' })
  createService(@Body() dto: CreateServiceItemDto, @Req() req: any) {
    return this.adminControlService.createService(dto, req.user?.id);
  }

  @Get('services')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'List all catalogue services with filters' })
  @ApiResponse({ status: 200, description: 'List of services' })
  findAllServices(@Query() query: QueryServiceItemDto) {
    return this.adminControlService.findAllServices(query);
  }

  @Get('services/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Get service details by ID' })
  @ApiResponse({ status: 200, description: 'Service details' })
  findServiceById(@Param('id') id: string) {
    return this.adminControlService.findServiceById(id);
  }

  @Patch('services/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update catalogue service' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  updateService(
    @Param('id') id: string,
    @Body() dto: UpdateServiceItemDto,
    @Req() req: any,
  ) {
    return this.adminControlService.updateService(id, dto, req.user?.id);
  }

  @Delete('services/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete catalogue service' })
  @ApiResponse({ status: 200, description: 'Service deleted' })
  deleteService(@Param('id') id: string, @Req() req: any) {
    return this.adminControlService.deleteService(id, req.user?.id);
  }

  @Post('services/calculate-quote')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Calculate quote preview for sales proposal' })
  @ApiResponse({ status: 200, description: 'Price breakdown' })
  calculateQuote(@Body() dto: CalculateQuoteDto) {
    return this.adminControlService.calculateDynamicQuote(dto);
  }

  // ==========================================
  // PRICING RULES MANAGEMENT (ADMIN/MANAGER)
  // ==========================================

  @Post('pricing-rules')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create dynamic pricing or promotional rule' })
  @ApiResponse({ status: 201, description: 'Pricing rule created' })
  createPricingRule(@Body() dto: CreatePricingRuleDto, @Req() req: any) {
    return this.adminControlService.createPricingRule(dto, req.user?.id);
  }

  @Get('pricing-rules')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'List pricing rules' })
  @ApiResponse({ status: 200, description: 'List of pricing rules' })
  findAllPricingRules(@Query() query: QueryPricingRuleDto) {
    return this.adminControlService.findAllPricingRules(query);
  }

  @Patch('pricing-rules/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule updated' })
  updatePricingRule(
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
    @Req() req: any,
  ) {
    return this.adminControlService.updatePricingRule(id, dto, req.user?.id);
  }

  @Delete('pricing-rules/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule deleted' })
  deletePricingRule(@Param('id') id: string, @Req() req: any) {
    return this.adminControlService.deletePricingRule(id, req.user?.id);
  }

  // ==========================================
  // FEATURE FLAGS MANAGEMENT (ADMIN)
  // ==========================================

  @Post('feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create feature flag for cross-surface control' })
  @ApiResponse({ status: 201, description: 'Feature flag created' })
  createFeatureFlag(@Body() dto: CreateFeatureFlagDto, @Req() req: any) {
    return this.adminControlService.createFeatureFlag(dto, req.user?.id);
  }

  @Get('feature-flags')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all feature flags' })
  @ApiResponse({ status: 200, description: 'List of feature flags' })
  findAllFeatureFlags(@Query() query: QueryFeatureFlagDto) {
    return this.adminControlService.findAllFeatureFlags(query);
  }

  @Patch('feature-flags/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update feature flag toggle, surface, or rollout' })
  @ApiResponse({ status: 200, description: 'Feature flag updated' })
  updateFeatureFlag(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() req: any,
  ) {
    return this.adminControlService.updateFeatureFlag(id, dto, req.user?.id);
  }

  @Delete('feature-flags/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted' })
  deleteFeatureFlag(@Param('id') id: string, @Req() req: any) {
    return this.adminControlService.deleteFeatureFlag(id, req.user?.id);
  }

  // ==========================================
  // PIPELINE ROUTING RULES (ADMIN/MANAGER)
  // ==========================================

  @Post('routing-rules')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create lead pipeline routing rule' })
  @ApiResponse({ status: 201, description: 'Routing rule created' })
  createRoutingRule(@Body() dto: CreateRoutingRuleDto, @Req() req: any) {
    return this.adminControlService.createRoutingRule(dto, req.user?.id);
  }

  @Get('routing-rules')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List pipeline routing rules ordered by priority' })
  @ApiResponse({ status: 200, description: 'List of routing rules' })
  findAllRoutingRules(@Query() query: QueryRoutingRuleDto) {
    return this.adminControlService.findAllRoutingRules(query);
  }

  @Patch('routing-rules/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update pipeline routing rule' })
  @ApiResponse({ status: 200, description: 'Routing rule updated' })
  updateRoutingRule(
    @Param('id') id: string,
    @Body() dto: UpdateRoutingRuleDto,
    @Req() req: any,
  ) {
    return this.adminControlService.updateRoutingRule(id, dto, req.user?.id);
  }

  @Delete('routing-rules/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete pipeline routing rule' })
  @ApiResponse({ status: 200, description: 'Routing rule deleted' })
  deleteRoutingRule(@Param('id') id: string, @Req() req: any) {
    return this.adminControlService.deleteRoutingRule(id, req.user?.id);
  }

  @Post('routing-rules/test-evaluate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Simulate/Test lead routing rule evaluation' })
  @ApiResponse({ status: 200, description: 'Evaluation decision and matching rule' })
  testEvaluateRouting(@Body() dto: EvaluateLeadRoutingDto) {
    return this.adminControlService.evaluateLeadRouting(dto);
  }
}

