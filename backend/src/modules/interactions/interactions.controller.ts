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
import { InteractionsService } from './interactions.service';
import { CreateInteractionDto, QueryInteractionDto } from './dto/interaction.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Interaction Timeline')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Log a new interaction / touchpoint for a person' })
  @ApiResponse({ status: 201, description: 'Interaction logged' })
  create(@Body() createInteractionDto: CreateInteractionDto) {
    return this.interactionsService.create(createInteractionDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Query interaction feed with filters (channel, type, staff)' })
  @ApiResponse({ status: 200, description: 'List of interactions' })
  findAll(@Query() query: QueryInteractionDto) {
    return this.interactionsService.findAll(query);
  }

  @Get('person/:personId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Get complete interaction timeline for a specific person' })
  @ApiResponse({ status: 200, description: 'Interaction timeline for person' })
  findByPerson(@Param('personId') personId: string) {
    return this.interactionsService.findByPerson(personId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Get interaction details by ID' })
  @ApiResponse({ status: 200, description: 'Interaction details' })
  findOne(@Param('id') id: string) {
    return this.interactionsService.findOne(id);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Assign staff owner to an interaction' })
  @ApiResponse({ status: 200, description: 'Owner assigned' })
  assignOwner(@Param('id') id: string, @Body('ownerId') ownerId: string) {
    return this.interactionsService.assignOwner(id, ownerId);
  }
}
