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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersRbacService } from './users-rbac.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Staff & RBAC')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('staff')
export class UsersRbacController {
  constructor(private readonly usersRbacService: UsersRbacService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new staff member (Admin only)' })
  @ApiResponse({ status: 201, description: 'Staff member created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.usersRbacService.create(createStaffDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all staff members with optional filters (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'List of staff members' })
  findAll(@Query() query: QueryStaffDto) {
    return this.usersRbacService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get staff member profile by ID (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Staff member details' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  findOne(@Param('id') id: string) {
    return this.usersRbacService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update staff member details, role or status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Staff member updated' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.usersRbacService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate staff member (Admin only)' })
  @ApiResponse({ status: 200, description: 'Staff member deactivated' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  remove(@Param('id') id: string) {
    return this.usersRbacService.remove(id);
  }
}
