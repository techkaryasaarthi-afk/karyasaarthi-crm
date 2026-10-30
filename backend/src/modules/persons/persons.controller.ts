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
import { Role } from '@prisma/client';
import { PersonsService } from './persons.service';
import { CreatePersonDto, UpdatePersonDto, QueryPersonDto, ErasePersonDataDto } from './dto/person.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Unified Person & Identity Graph')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Create or stitch unified person record' })
  @ApiResponse({ status: 201, description: 'Person record created/linked successfully' })
  create(@Body() createPersonDto: CreatePersonDto) {
    return this.personsService.create(createPersonDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Query all persons with filters, search, and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of persons' })
  findAll(@Query() query: QueryPersonDto) {
    return this.personsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Get 360-degree person profile with complete interaction timeline' })
  @ApiResponse({ status: 200, description: 'Person 360 profile' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  findOne(@Param('id') id: string) {
    return this.personsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Update person details and consent flags' })
  @ApiResponse({ status: 200, description: 'Person updated successfully' })
  update(@Param('id') id: string, @Body() updatePersonDto: UpdatePersonDto) {
    return this.personsService.update(id, updatePersonDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete person record (Admin only)' })
  @ApiResponse({ status: 200, description: 'Person deleted' })
  remove(@Param('id') id: string) {
    return this.personsService.remove(id);
  }

  @Post(':id/erase-data')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Right to be Forgotten / Data Erasure (GDPR & DPDP Compliance)',
    description: 'Anonymizes PII across person profile, applications, and comms while preserving financial invoices',
  })
  @ApiResponse({ status: 200, description: 'Person data securely erased and anonymized' })
  eraseData(
    @Param('id') id: string,
    @Body() dto: ErasePersonDataDto,
    @Req() req: any,
  ) {
    return this.personsService.erasePersonData(id, dto.reason, req.user?.id);
  }

  @Get(':id/export-data')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Right to Data Portability (GDPR & DPDP Compliance)',
    description: 'Exports portable JSON dossier of all interactions, applications, projects, and records',
  })
  @ApiResponse({ status: 200, description: 'Complete portable customer dossier' })
  exportData(@Param('id') id: string) {
    return this.personsService.exportPersonData(id);
  }
}

