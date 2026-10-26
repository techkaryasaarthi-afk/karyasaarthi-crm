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
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
  CreateLeadTaskDto,
  QueryLeadDto,
} from './dto/lead.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Lead & Pipeline Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Create new lead card',
    description: 'Creates lead with automatic round-robin assignment and Claude Haiku lead scoring.',
  })
  @ApiResponse({ status: 201, description: 'Lead card created successfully' })
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get('kanban')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({
    summary: 'Get Kanban Pipeline Board',
    description: 'Retrieves leads grouped into 6 stages (NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, WON, LOST) with summary metrics.',
  })
  @ApiResponse({ status: 200, description: 'Kanban board columns and counts' })
  getKanbanBoard() {
    return this.leadsService.getKanbanBoard();
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Query leads list with filters and pagination' })
  @ApiResponse({ status: 200, description: 'List of leads' })
  findAll(@Query() query: QueryLeadDto) {
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Get detailed lead card by ID' })
  @ApiResponse({ status: 200, description: 'Lead card details with tasks and contact' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id/stage')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Update lead Kanban stage',
    description: 'Moves lead card across pipeline columns with audit log. Converts to client if WON.',
  })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
    @Req() req: any,
  ) {
    const actorId = req.user?.id;
    return this.leadsService.updateStage(id, dto, actorId);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Assign lead to staff member' })
  @ApiResponse({ status: 200, description: 'Lead assigned' })
  assignLead(@Param('id') id: string, @Body('staffId') staffId: string) {
    return this.leadsService.assignLead(id, staffId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Update lead details' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    return this.leadsService.update(id, updateLeadDto);
  }

  @Post(':id/tasks')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Add follow-up task/reminder to lead' })
  @ApiResponse({ status: 201, description: 'Task created' })
  createTask(@Param('id') id: string, @Body() dto: CreateLeadTaskDto) {
    return this.leadsService.createTask(id, dto);
  }

  @Patch('tasks/:taskId/complete')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Mark follow-up task as completed' })
  @ApiResponse({ status: 200, description: 'Task completed' })
  completeTask(@Param('taskId') taskId: string) {
    return this.leadsService.completeTask(taskId);
  }
}
