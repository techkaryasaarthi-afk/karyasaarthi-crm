import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RELEASED = 'RELEASED',
  HELD = 'HELD',
}

export class CreateVendorProfileDto {
  @ApiProperty({ description: 'Person ID (UUID) to register as Vendor/Expert' })
  @IsUUID()
  personId: string;

  @ApiProperty({
    description: 'Array of core competencies and tech skills',
    example: ['NestJS', 'React', 'Figma', 'SEO'],
  })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiPropertyOptional({
    description: 'Maximum concurrent project capacity',
    default: 3,
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Vendor agreement or contract file URL' })
  @IsOptional()
  @IsString()
  contractUrl?: string;

  @ApiPropertyOptional({ description: 'Whether NDA has been executed', default: false })
  @IsOptional()
  @IsBoolean()
  ndaSigned?: boolean;
}

export class UpdateVendorProfileDto {
  @ApiPropertyOptional({ description: 'Updated skills list' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Updated max capacity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Expert performance rating (1.0 to 5.0)', example: 4.8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Total completed client projects count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  completedProjects?: number;

  @ApiPropertyOptional({ description: 'Contract URL' })
  @IsOptional()
  @IsString()
  contractUrl?: string;

  @ApiPropertyOptional({ description: 'NDA execution status' })
  @IsOptional()
  @IsBoolean()
  ndaSigned?: boolean;
}

export class AssignVendorToProjectDto {
  @ApiProperty({ description: 'Project ID (UUID) to assign' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Vendor Person ID (UUID)' })
  @IsUUID()
  vendorPersonId: string;
}

export class CreateVendorPayoutDto {
  @ApiProperty({ description: 'Vendor Profile ID (UUID)' })
  @IsUUID()
  vendorId: string;

  @ApiProperty({ description: 'Associated Project ID (UUID)' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Milestone ID (UUID) if tied to a milestone' })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiProperty({ description: 'Payout amount in currency units', example: 15000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ enum: PayoutStatus, default: PayoutStatus.PENDING })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiPropertyOptional({ description: 'Audit notes or bank transfer references' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayoutStatusDto {
  @ApiProperty({ enum: PayoutStatus, description: 'Updated Payout Status' })
  @IsEnum(PayoutStatus)
  status: PayoutStatus;

  @ApiPropertyOptional({ description: 'Resolution or transaction remarks' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryVendorDto {
  @ApiPropertyOptional({ description: 'Filter by specific skill' })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({ description: 'Filter by NDA signing status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  ndaSigned?: boolean;

  @ApiPropertyOptional({ description: 'Filter only vendors with remaining capacity' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  availableOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search vendor name or email' })
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
