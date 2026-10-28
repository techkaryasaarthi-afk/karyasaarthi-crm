import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'Staff member UUID who performed the mutation' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiProperty({ description: 'Action name (e.g. CREATE, UPDATE_STAGE, RELEASE_PAYOUT, REVISION_RESOLVED)' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Entity Name (e.g. Lead, Project, Invoice, Application, VendorPayout)' })
  @IsString()
  entity: string;

  @ApiProperty({ description: 'Target Entity Record UUID' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ description: 'JSON diff representing before and after states or change metadata' })
  @IsOptional()
  @IsObject()
  diff?: Record<string, any>;
}

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Filter by entity type (Lead, Project, Invoice, etc.)' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: 'Filter by specific entity record UUID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor Staff ID' })
  @IsOptional()
  @IsString()
  actorId?: string;

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
