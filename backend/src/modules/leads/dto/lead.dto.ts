import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeadStage, LeadUrgency, Surface } from '@prisma/client';

export class CreateLeadDto {
  @ApiProperty({ description: 'ID of the unified Person record this lead belongs to' })
  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @ApiProperty({ description: 'Title or project summary for the lead card', example: 'Enterprise Fintech Mobile App' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ enum: LeadStage, default: LeadStage.NEW })
  @IsEnum(LeadStage)
  @IsOptional()
  stage?: LeadStage;

  @ApiPropertyOptional({ description: 'Lead quality score (0-100). If omitted, Claude Haiku evaluates automatically.' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({ enum: LeadUrgency, default: LeadUrgency.MEDIUM })
  @IsEnum(LeadUrgency)
  @IsOptional()
  urgency?: LeadUrgency;

  @ApiPropertyOptional({ description: 'Estimated project value in USD or INR', example: 25000 })
  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @ApiPropertyOptional({ description: 'Service category requested', example: 'Mobile & Web Development' })
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiProperty({ enum: Surface, description: 'Source surface of lead acquisition', example: Surface.SITE_COM })
  @IsEnum(Surface)
  sourceSurface: Surface;

  @ApiPropertyOptional({ description: 'Assigned staff owner ID. If omitted, assigned via round-robin.' })
  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Internal staff notes or context' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ description: 'Title or project summary' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: LeadStage })
  @IsEnum(LeadStage)
  @IsOptional()
  stage?: LeadStage;

  @ApiPropertyOptional({ description: 'Lead quality score (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({ enum: LeadUrgency })
  @IsEnum(LeadUrgency)
  @IsOptional()
  urgency?: LeadUrgency;

  @ApiPropertyOptional({ description: 'Estimated project value' })
  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @ApiPropertyOptional({ description: 'Service category' })
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiPropertyOptional({ description: 'Assigned staff owner ID' })
  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLeadStageDto {
  @ApiProperty({ enum: LeadStage, description: 'New pipeline stage' })
  @IsEnum(LeadStage)
  @IsNotEmpty()
  stage: LeadStage;

  @ApiPropertyOptional({ description: 'Reason or transition note' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateLeadTaskDto {
  @ApiProperty({ description: 'Task description / follow-up item', example: 'Schedule technical discovery call' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Due date timestamp', example: '2026-10-30T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  dueAt: string;

  @ApiPropertyOptional({ description: 'Assigned staff member ID' })
  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;
}

export class QueryLeadDto {
  @ApiPropertyOptional({ enum: LeadStage, description: 'Filter by stage' })
  @IsEnum(LeadStage)
  @IsOptional()
  stage?: LeadStage;

  @ApiPropertyOptional({ enum: LeadUrgency, description: 'Filter by urgency' })
  @IsEnum(LeadUrgency)
  @IsOptional()
  urgency?: LeadUrgency;

  @ApiPropertyOptional({ enum: Surface, description: 'Filter by surface' })
  @IsEnum(Surface)
  @IsOptional()
  sourceSurface?: Surface;

  @ApiPropertyOptional({ description: 'Filter by assigned staff ID' })
  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Search term for title or person name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
