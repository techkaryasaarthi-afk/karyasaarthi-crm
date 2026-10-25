import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicApiService } from './public-api.service';
import { PublicEnquiryDto, PublicChatDto, PublicApplicationDto } from './dto/public-api.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public Multi-Surface Ingestion')
@Controller('public')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Public()
  @Post('forms/enquiry')
  @ApiOperation({
    summary: 'Submit enquiry form (karyasaarthi.com & karyasaarthi.in)',
    description: 'Ingests project enquiry, executes cross-surface identity stitching, and calculates AI routing with Claude Haiku.',
  })
  @ApiResponse({ status: 201, description: 'Enquiry received and routed' })
  submitEnquiry(@Body() dto: PublicEnquiryDto) {
    return this.publicApiService.handleEnquiry(dto);
  }

  @Public()
  @Post('chat/messages')
  @ApiOperation({
    summary: 'Send chat message from website widget or mobile app',
    description: 'Ingests real-time chat initial message and links to person identity graph.',
  })
  @ApiResponse({ status: 201, description: 'Chat message ingested' })
  submitChatMessage(@Body() dto: PublicChatDto) {
    return this.publicApiService.handleChatMessage(dto);
  }

  @Public()
  @Post('applications')
  @ApiOperation({
    summary: 'Submit job application (career.karyasaarthi.com)',
    description: 'Ingests candidate CV submission and links applicant to unified identity model.',
  })
  @ApiResponse({ status: 201, description: 'Application received' })
  submitApplication(@Body() dto: PublicApplicationDto) {
    return this.publicApiService.handleApplication(dto);
  }

  @Public()
  @Get('careers/jobs')
  @ApiOperation({ summary: 'Get active job listings for career portal' })
  @ApiResponse({ status: 200, description: 'List of open positions' })
  getJobs() {
    return this.publicApiService.getPublicJobs();
  }
}
