import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Surface, InteractionType } from '@prisma/client';

export class CreateInteractionDto {
  @ApiProperty({ description: 'UUID of the person this interaction belongs to' })
  @IsUUID()
  personId: string;

  @ApiProperty({ enum: Surface, description: 'Channel the touchpoint occurred on', example: Surface.SITE_COM })
  @IsEnum(Surface)
  channel: Surface;

  @ApiProperty({ enum: InteractionType, description: 'Type of event/interaction', example: InteractionType.FORM })
  @IsEnum(InteractionType)
  type: InteractionType;

  @ApiProperty({
    description: 'Arbitrary structured payload (form fields, message text, metadata)',
    example: { subject: 'Project inquiry', message: 'Need an iOS & Android app', budget: '$10k' },
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ description: 'Optional assigned staff owner ID' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;
}

export class QueryInteractionDto {
  @ApiPropertyOptional({ description: 'Filter by specific person ID' })
  @IsUUID()
  @IsOptional()
  personId?: string;

  @ApiPropertyOptional({ enum: Surface, description: 'Filter by channel' })
  @IsEnum(Surface)
  @IsOptional()
  channel?: Surface;

  @ApiPropertyOptional({ enum: InteractionType, description: 'Filter by interaction type' })
  @IsEnum(InteractionType)
  @IsOptional()
  type?: InteractionType;

  @ApiPropertyOptional({ description: 'Filter by staff owner ID' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
