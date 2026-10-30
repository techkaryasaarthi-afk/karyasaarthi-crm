import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PersonType, Surface } from '@prisma/client';

export class CreatePersonDto {
  @ApiProperty({ description: 'Full name of the contact', example: 'Rahul Sharma' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ description: 'Email address (unique across system)', example: 'rahul.sharma@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number with country code', example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: PersonType, default: PersonType.LEAD, description: 'Person category' })
  @IsEnum(PersonType)
  @IsOptional()
  type?: PersonType;

  @ApiProperty({ enum: Surface, description: 'First surface the person contacted from' })
  @IsEnum(Surface)
  firstTouchSource: Surface;

  @ApiPropertyOptional({
    description: 'Explicit consent flags for privacy conformance',
    example: { marketingConsent: true, whatsappConsent: true },
  })
  @IsObject()
  @IsOptional()
  consentFlags?: Record<string, any>;
}

export class UpdatePersonDto {
  @ApiPropertyOptional({ description: 'Full name of the contact' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: PersonType })
  @IsEnum(PersonType)
  @IsOptional()
  type?: PersonType;

  @ApiPropertyOptional({ description: 'Explicit consent flags' })
  @IsObject()
  @IsOptional()
  consentFlags?: Record<string, any>;
}

export class QueryPersonDto {
  @ApiPropertyOptional({ description: 'Search across fullName, email, and phone' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: PersonType, description: 'Filter by person type' })
  @IsEnum(PersonType)
  @IsOptional()
  type?: PersonType;

  @ApiPropertyOptional({ enum: Surface, description: 'Filter by first touch source surface' })
  @IsEnum(Surface)
  @IsOptional()
  firstTouchSource?: Surface;

  @ApiPropertyOptional({ description: 'Pagination page number', default: 1 })
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

export class ErasePersonDataDto {
  @ApiPropertyOptional({
    example: 'Customer requested data deletion under GDPR / DPDP',
    description: 'Reason for erasure',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

