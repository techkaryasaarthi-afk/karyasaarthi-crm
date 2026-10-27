import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CareersService } from './careers.service';
import {
  CreateJobPostingDto,
  UpdateJobPostingDto,
  SubmitApplicationDto,
  UpdateApplicationStageDto,
  ScheduleInterviewDto,
  GenerateOfferDto,
  QueryJobPostingDto,
  QueryApplicationDto,
} from './dto/career.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Careers & Recruitment Pipeline (ATS)')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  // -------------------------------------------------------------
  // Public Job Openings
  // -------------------------------------------------------------

  @Public()
  @Get('jobs')
  @ApiOperation({
    summary: 'Public list of open career opportunities',
    description: 'Returns active job openings for career.karyasaarthi.com portal.',
  })
  @ApiResponse({ status: 200, description: 'List of job postings' })
  findAllJobs(@Query() query: QueryJobPostingDto) {
    return this.careersService.findAllJobs(query);
  }

  @Public()
  @Get('jobs/:id')
  @ApiOperation({ summary: 'Public job posting details' })
  @ApiResponse({ status: 200, description: 'Job posting details' })
  findOneJob(@Param('id') id: string) {
    return this.careersService.findOneJob(id);
  }

  @Post('jobs')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create new job posting (ATS)' })
  @ApiResponse({ status: 201, description: 'Job posting created' })
  createJob(@Body() dto: CreateJobPostingDto) {
    return this.careersService.createJob(dto);
  }

  @Patch('jobs/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update job posting details' })
  @ApiResponse({ status: 200, description: 'Job posting updated' })
  updateJob(@Param('id') id: string, @Body() dto: UpdateJobPostingDto) {
    return this.careersService.updateJob(id, dto);
  }

  // -------------------------------------------------------------
  // Applications & Candidate Evaluation
  // -------------------------------------------------------------

  @Public()
  @Post('applications')
  @ApiOperation({
    summary: 'Submit candidate job application',
    description: 'Ingests candidate application, elevates person to APPLICANT, and triggers Claude Sonnet AI candidate scorecard.',
  })
  @ApiResponse({ status: 201, description: 'Application submitted with AI scorecard' })
  submitApplication(@Body() dto: SubmitApplicationDto) {
    return this.careersService.submitApplication(dto);
  }

  @Get('applications')
  @Roles(Role.ADMIN, Role.MANAGER, Role.VIEWER)
  @ApiOperation({
    summary: 'Query candidate applications pipeline (ATS)',
    description: 'Filter candidates by role, stage (APPLIED, SCREENED, INTERVIEW, OFFER, REJECTED), or minimum AI match score.',
  })
  @ApiResponse({ status: 200, description: 'List of candidate applications' })
  findAllApplications(@Query() query: QueryApplicationDto) {
    return this.careersService.findAllApplications(query);
  }

  @Get('applications/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.VIEWER)
  @ApiOperation({ summary: 'Get candidate application card and AI evaluation scorecard' })
  @ApiResponse({ status: 200, description: 'Candidate application details' })
  findOneApplication(@Param('id') id: string) {
    return this.careersService.findOneApplication(id);
  }

  @Patch('applications/:id/stage')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update candidate ATS hiring stage' })
  @ApiResponse({ status: 200, description: 'Application stage updated' })
  updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStageDto,
    @Req() req: any,
  ) {
    const reviewerId = req.user?.id;
    return this.careersService.updateStage(id, dto, reviewerId);
  }

  @Post('applications/:id/interview')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Schedule candidate interview' })
  @ApiResponse({ status: 200, description: 'Interview scheduled' })
  scheduleInterview(
    @Param('id') id: string,
    @Body() dto: ScheduleInterviewDto,
    @Req() req: any,
  ) {
    const reviewerId = req.user?.id;
    return this.careersService.scheduleInterview(id, dto, reviewerId);
  }

  @Post('applications/:id/offer')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Generate and record candidate job offer' })
  @ApiResponse({ status: 200, description: 'Job offer recorded' })
  generateOffer(
    @Param('id') id: string,
    @Body() dto: GenerateOfferDto,
    @Req() req: any,
  ) {
    const reviewerId = req.user?.id;
    return this.careersService.generateOffer(id, dto, reviewerId);
  }

  @Post('applications/:id/ai-evaluate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Trigger on-demand Claude Sonnet candidate evaluation',
    description: 'Re-evaluates candidate resume and skills against job requirements using Claude Sonnet.',
  })
  @ApiResponse({ status: 200, description: 'AI evaluation updated' })
  evaluateWithAi(
    @Param('id') id: string,
    @Body('resumeText') resumeText?: string,
  ) {
    return this.careersService.evaluateWithAi(id, resumeText);
  }
}
