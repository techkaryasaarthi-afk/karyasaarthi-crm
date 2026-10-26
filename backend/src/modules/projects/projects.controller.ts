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
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateProjectStageDto,
  UpdateProjectStatusDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  SubmitDeliverableDto,
  UpdateDeliverableStatusDto,
  CreateRevisionRequestDto,
  UpdateRevisionStatusDto,
  ConvertLeadToProjectDto,
  QueryProjectDto,
} from './dto/project.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Project Execution & Delivery Tracking')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Commission new project',
    description: 'Creates a project card linked to a client Person, with stage tracking and budget allocation.',
  })
  @ApiResponse({ status: 201, description: 'Project commissioned successfully' })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Post('convert-lead')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Convert WON Lead into an active delivery Project',
    description: 'Elevates Person to CLIENT, marks lead as WON, and initializes a Project card in SCOPING stage.',
  })
  @ApiResponse({ status: 201, description: 'Lead converted to Project' })
  convertLead(@Body() dto: ConvertLeadToProjectDto, @Req() req: any) {
    const actorId = req.user?.id;
    return this.projectsService.convertLeadToProject(dto, actorId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Query projects list',
    description: 'Filter projects by execution stage, status, client, or assigned vendor with pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of projects' })
  findAll(@Query() query: QueryProjectDto) {
    return this.projectsService.findAll(query);
  }

  @Get('client/:clientId/overview')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Client Portal / Mobile App Project Delivery Overview',
    description: 'Provides client-facing progress metrics, milestone completion percentages, deliverables, and revision requests.',
  })
  @ApiResponse({ status: 200, description: 'Client project delivery summary' })
  getClientProjectOverview(@Param('clientId') clientId: string) {
    return this.projectsService.getClientProjectOverview(clientId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VENDOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Get comprehensive project details',
    description: 'Includes milestones, deliverable versions, revision threads, and vendor payout allocations.',
  })
  @ApiResponse({ status: 200, description: 'Project details' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update project metadata' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Patch(':id/stage')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update project lifecycle stage',
    description: 'Transitions project through SCOPING -> IN_PROGRESS -> REVIEW -> DELIVERED.',
  })
  @ApiResponse({ status: 200, description: 'Stage transitioned' })
  updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateProjectStageDto,
    @Req() req: any,
  ) {
    const actorId = req.user?.id;
    return this.projectsService.updateStage(id, dto, actorId);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update project operational status (ACTIVE, ON_HOLD, DELIVERED)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(id, dto);
  }

  @Post(':id/milestones')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Add milestone to project' })
  @ApiResponse({ status: 201, description: 'Milestone created' })
  addMilestone(
    @Param('id') id: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projectsService.addMilestone(id, dto);
  }

  @Patch('milestones/:milestoneId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update milestone details' })
  @ApiResponse({ status: 200, description: 'Milestone updated' })
  updateMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.projectsService.updateMilestone(milestoneId, dto);
  }

  @Patch('milestones/:milestoneId/complete')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Mark milestone as completed' })
  @ApiResponse({ status: 200, description: 'Milestone marked completed' })
  completeMilestone(@Param('milestoneId') milestoneId: string) {
    return this.projectsService.completeMilestone(milestoneId);
  }

  @Post(':id/deliverables')
  @Roles(Role.ADMIN, Role.MANAGER, Role.VENDOR)
  @ApiOperation({ summary: 'Submit project deliverable / asset' })
  @ApiResponse({ status: 201, description: 'Deliverable registered' })
  submitDeliverable(
    @Param('id') id: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    return this.projectsService.submitDeliverable(id, dto);
  }

  @Patch('deliverables/:deliverableId/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update deliverable approval status (DRAFT, SUBMITTED, APPROVED, REJECTED)' })
  @ApiResponse({ status: 200, description: 'Deliverable status updated' })
  updateDeliverableStatus(
    @Param('deliverableId') deliverableId: string,
    @Body() dto: UpdateDeliverableStatusDto,
  ) {
    return this.projectsService.updateDeliverableStatus(deliverableId, dto);
  }

  @Post(':id/revisions')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Log client revision request' })
  @ApiResponse({ status: 201, description: 'Revision request logged' })
  requestRevision(
    @Param('id') id: string,
    @Body() dto: CreateRevisionRequestDto,
  ) {
    return this.projectsService.requestRevision(id, dto);
  }

  @Patch('revisions/:revisionId/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update revision request status (OPEN, IN_PROGRESS, RESOLVED, DECLINED)' })
  @ApiResponse({ status: 200, description: 'Revision status updated' })
  updateRevisionStatus(
    @Param('revisionId') revisionId: string,
    @Body() dto: UpdateRevisionStatusDto,
  ) {
    return this.projectsService.updateRevisionStatus(revisionId, dto);
  }
}
