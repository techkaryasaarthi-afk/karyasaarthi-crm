import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export { NotificationType };

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target recipient UUID (Staff member ID or Person ID)' })
  @IsString()
  recipientId: string;

  @ApiProperty({ description: 'Notification Title', example: '🚨 15-Minute SLA Breach Escalation' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed notification body or action required' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.SYSTEM_ALERT })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Deep link URL to associated entity', example: '/inbox/conversations/123' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: 'Structured metadata or entity IDs' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryNotificationDto {
  @ApiPropertyOptional({ description: 'Filter unread notifications only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

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
