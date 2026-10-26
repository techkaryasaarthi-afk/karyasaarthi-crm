import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProjectStage {
  SCOPING = 'SCOPING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DELIVERED = 'DELIVERED',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  DELIVERED = 'DELIVERED',
  ON_HOLD = 'ON_HOLD',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

export enum DeliverableStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum RevisionStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DECLINED = 'DECLINED',
}

import { Surface } from '@prisma/client';
export { Surface };

export class CreateProjectDto {
  @ApiProperty({ description: 'Project Title', example: 'E-commerce Redesign & Mobile App' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed Project Scope / Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Client Person ID (UUID)' })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ description: 'Assigned Vendor / Expert Person ID (UUID)' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiProperty({ description: 'Service Line / Category', example: 'WEB_DEVELOPMENT' })
  @IsString()
  serviceType: string;

  @ApiPropertyOptional({ enum: ProjectStage, default: ProjectStage.SCOPING })
  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Total agreed budget in currency units', example: 75000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Currency ISO Code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Target delivery deadline ISO timestamp' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ enum: Surface, default: Surface.SITE_COM })
  @IsOptional()
  @IsEnum(Surface)
  sourceSurface?: Surface;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Updated Project Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated Scope / Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Reassign or Assign Vendor Person ID' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Service Category' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: 'Updated agreed budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Target delivery deadline ISO timestamp' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class UpdateProjectStageDto {
  @ApiProperty({ enum: ProjectStage, description: 'New execution stage' })
  @IsEnum(ProjectStage)
  stage: ProjectStage;

  @ApiPropertyOptional({ description: 'Optional milestone notes or transition memo' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProjectStatusDto {
  @ApiProperty({ enum: ProjectStatus, description: 'Project Status' })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiPropertyOptional({ description: 'Reason for status update (e.g. hold reason)' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMilestoneDto {
  @ApiProperty({ description: 'Milestone Title', example: 'Milestone 1: UI/UX Prototypes & Architecture' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Milestone description and deliverables criteria' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MilestoneStatus, default: MilestoneStatus.PENDING })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiPropertyOptional({ description: 'Expected completion date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Milestone billing value', example: 25000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional({ description: 'Milestone Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Milestone description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MilestoneStatus })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiPropertyOptional({ description: 'Expected completion date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Milestone billing value' })
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class SubmitDeliverableDto {
  @ApiProperty({ description: 'Deliverable Title', example: 'Figma High-Fidelity Prototype v1' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Cloud storage URL or asset download link' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Deliverable revision version', default: 1 })
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiPropertyOptional({ enum: DeliverableStatus, default: DeliverableStatus.SUBMITTED })
  @IsOptional()
  @IsEnum(DeliverableStatus)
  status?: DeliverableStatus;
}

export class UpdateDeliverableStatusDto {
  @ApiProperty({ enum: DeliverableStatus, description: 'Deliverable Review Status' })
  @IsEnum(DeliverableStatus)
  status: DeliverableStatus;
}

export class CreateRevisionRequestDto {
  @ApiPropertyOptional({ description: 'Deliverable ID associated with revision' })
  @IsOptional()
  @IsUUID()
  deliverableId?: string;

  @ApiProperty({ description: 'Name or ID of client reviewer requesting revision' })
  @IsString()
  requestedBy: string;

  @ApiProperty({ description: 'Specific change requests and actionable feedback' })
  @IsString()
  feedback: string;
}

export class UpdateRevisionStatusDto {
  @ApiProperty({ enum: RevisionStatus, description: 'Revision Status' })
  @IsEnum(RevisionStatus)
  status: RevisionStatus;
}

export class ConvertLeadToProjectDto {
  @ApiProperty({ description: 'Lead ID to convert to active Project' })
  @IsUUID()
  leadId: string;

  @ApiPropertyOptional({ description: 'Custom project title (defaults to lead title)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Assigned Vendor / Expert Person ID' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Service category override' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: 'Agreed contract budget' })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ description: 'Agreed delivery deadline' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class QueryProjectDto {
  @ApiPropertyOptional({ enum: ProjectStage })
  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Filter by Client Person ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by Vendor Person ID' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Search title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
