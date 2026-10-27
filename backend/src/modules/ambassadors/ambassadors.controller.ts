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
import { AmbassadorsService } from './ambassadors.service';
import {
  OnboardAmbassadorDto,
  UpdateAmbassadorDto,
  RecordReferralDto,
  QueryAmbassadorDto,
} from './dto/ambassador.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Campus Ambassador & Affiliate Network')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('ambassadors')
export class AmbassadorsController {
  constructor(private readonly ambassadorsService: AmbassadorsService) {}

  @Post('onboard')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Onboard new Campus Ambassador',
    description: 'Registers student ambassador with college affiliation and unique referral coupon code.',
  })
  @ApiResponse({ status: 201, description: 'Ambassador onboarded successfully' })
  onboard(@Body() dto: OnboardAmbassadorDto) {
    return this.ambassadorsService.onboard(dto);
  }

  @Public()
  @Get('leaderboard')
  @ApiOperation({
    summary: 'Public Campus Ambassador Leaderboard',
    description: 'Returns top performing student ambassadors ranked by successful conversions and referral points.',
  })
  @ApiResponse({ status: 200, description: 'Ranked list of top ambassadors' })
  getLeaderboard(@Query('limit') limit?: number) {
    return this.ambassadorsService.getLeaderboard(limit);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.VIEWER)
  @ApiOperation({ summary: 'Query ambassadors network with filters and pagination' })
  @ApiResponse({ status: 200, description: 'List of ambassadors' })
  findAll(@Query() query: QueryAmbassadorDto) {
    return this.ambassadorsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.VIEWER)
  @ApiOperation({ summary: 'Get ambassador profile and referral attribution history' })
  @ApiResponse({ status: 200, description: 'Ambassador profile details' })
  findOne(@Param('id') id: string) {
    return this.ambassadorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update ambassador college or operational status' })
  @ApiResponse({ status: 200, description: 'Ambassador updated' })
  update(@Param('id') id: string, @Body() dto: UpdateAmbassadorDto) {
    return this.ambassadorsService.update(id, dto);
  }

  @Post('referral')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Attribute referral to Campus Ambassador',
    description: 'Links an incoming lead or candidate application to an ambassador coupon code and credits commission.',
  })
  @ApiResponse({ status: 201, description: 'Referral attributed' })
  recordReferral(@Body() dto: RecordReferralDto) {
    return this.ambassadorsService.recordReferral(dto);
  }
}
