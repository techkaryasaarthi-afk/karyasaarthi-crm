import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VendorsService } from './vendors.service';
import {
  CreateVendorProfileDto,
  UpdateVendorProfileDto,
  AssignVendorToProjectDto,
  CreateVendorPayoutDto,
  UpdatePayoutStatusDto,
  QueryVendorDto,
  PayoutStatus,
} from './dto/vendor.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Vendor & Expert Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('profile')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Onboard & register Vendor / Expert profile',
    description: 'Binds a Person to a VendorProfile with tech skill tags, maximum workload capacity, and agreement status.',
  })
  @ApiResponse({ status: 201, description: 'Vendor profile created successfully' })
  createProfile(@Body() dto: CreateVendorProfileDto) {
    return this.vendorsService.createProfile(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Query vendor & expert network',
    description: 'Filter by tech skills, NDA execution, or live project availability with pagination.',
  })
  @ApiResponse({ status: 200, description: 'List of vendor profiles with live capacity utilization' })
  findAll(@Query() query: QueryVendorDto) {
    return this.vendorsService.findAll(query);
  }

  @Get('analytics/workload')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Vendor Network Workload & Capacity Indicator',
    description: 'Provides live aggregated metrics: total capacity slots, active project allocations, and network utilization percentage.',
  })
  @ApiResponse({ status: 200, description: 'Live workload analytics' })
  getWorkloadAnalytics() {
    return this.vendorsService.getWorkloadAnalytics();
  }

  @Get('payouts')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List milestone payouts across vendors' })
  @ApiResponse({ status: 200, description: 'List of vendor payouts' })
  getPayouts(
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: PayoutStatus,
  ) {
    return this.vendorsService.getPayouts(vendorId, status);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get vendor profile by ID or Person ID' })
  @ApiResponse({ status: 200, description: 'Vendor profile with active projects and history' })
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update vendor skills, capacity, rating, or NDA status' })
  @ApiResponse({ status: 200, description: 'Vendor profile updated' })
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateVendorProfileDto,
  ) {
    return this.vendorsService.updateProfile(id, dto);
  }

  @Post('assign')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Assign vendor to delivery project',
    description: 'Validates vendor live workload against maximum capacity before assigning to project.',
  })
  @ApiResponse({ status: 200, description: 'Vendor assigned to project' })
  assignVendorToProject(@Body() dto: AssignVendorToProjectDto) {
    return this.vendorsService.assignVendorToProject(dto);
  }

  @Post('payouts')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Schedule or create milestone payout for vendor' })
  @ApiResponse({ status: 201, description: 'Vendor payout created' })
  createPayout(@Body() dto: CreateVendorPayoutDto) {
    return this.vendorsService.createPayout(dto);
  }

  @Patch('payouts/:payoutId/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Approve, release, or hold vendor payout' })
  @ApiResponse({ status: 200, description: 'Payout status updated' })
  updatePayoutStatus(
    @Param('payoutId') payoutId: string,
    @Body() dto: UpdatePayoutStatusDto,
  ) {
    return this.vendorsService.updatePayoutStatus(payoutId, dto);
  }
}
