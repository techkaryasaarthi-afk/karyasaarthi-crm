import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNotEmpty,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Surface } from '@prisma/client';

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  SNOOZED = 'SNOOZED',
}

export enum SenderType {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  AI = 'AI',
  SYSTEM = 'SYSTEM',
}

export class CreateConversationDto {
  @ApiProperty({ description: 'ID of the unified Person record' })
  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @ApiProperty({ enum: Surface, description: 'Channel surface', example: Surface.SITE_COM })
  @IsEnum(Surface)
  channel: Surface;

  @ApiPropertyOptional({ description: 'Initial message if starting with a query' })
  @IsString()
  @IsOptional()
  initialMessage?: string;

  @ApiPropertyOptional({ description: 'Assigned staff ID' })
  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'Message text content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    enum: SenderType,
    default: SenderType.STAFF,
    description: 'Type of sender (CUSTOMER, STAFF, AI, SYSTEM)',
  })
  @IsEnum(SenderType)
  @IsOptional()
  senderType?: SenderType;

  @ApiPropertyOptional({
    description: 'If true, this is an internal staff note invisible to the client',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isInternalNote?: boolean;

  @ApiPropertyOptional({
    enum: Surface,
    description: 'Channel badge for the message',
  })
  @IsEnum(Surface)
  @IsOptional()
  channel?: Surface;

  @ApiPropertyOptional({
    description: 'Attached files, deliverables or image links',
    example: [{ name: 'spec.pdf', url: 'https://cdn.karyasaarthi.com/files/spec.pdf' }],
  })
  @IsArray()
  @IsOptional()
  attachments?: any[];
}

export class QueryConversationDto {
  @ApiPropertyOptional({ enum: ConversationStatus, description: 'Filter by status (OPEN, PENDING, RESOLVED, SNOOZED)' })
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @ApiPropertyOptional({ enum: Surface, description: 'Filter by channel' })
  @IsEnum(Surface)
  @IsOptional()
  channel?: Surface;

  @ApiPropertyOptional({ description: 'Filter by assigned staff ID' })
  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Search person name or message' })
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

export class CreateCannedReplyDto {
  @ApiProperty({ description: 'Macro shortcut (e.g. /pricing, /intro, /nda)', example: '/pricing' })
  @IsString()
  @IsNotEmpty()
  shortcut: string;

  @ApiProperty({ description: 'Descriptive title for staff picker', example: 'Standard Web Development Pricing' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Canned reply message body',
    example: 'Our web platform development packages start at $5,000 for standard applications with delivery in 4-6 weeks.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Category (Sales, Support, Onboarding)', example: 'Sales' })
  @IsString()
  @IsOptional()
  category?: string;
}

export class DraftToneDto {
  @ApiPropertyOptional({ description: 'Desired reply tone', example: 'friendly and concise' })
  @IsString()
  @IsOptional()
  tone?: string;
}

export class UpdateConversationStatusDto {
  @ApiProperty({ enum: ConversationStatus, description: 'Updated conversation status' })
  @IsEnum(ConversationStatus)
  @IsNotEmpty()
  status: ConversationStatus;
}

export class AssignConversationStaffDto {
  @ApiProperty({ description: 'Staff member ID' })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;
}
