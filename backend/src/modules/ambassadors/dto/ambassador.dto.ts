import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OnboardAmbassadorDto {
  @ApiProperty({ description: 'Person ID (UUID) to register as Campus Ambassador' })
  @IsUUID()
  personId: string;

  @ApiProperty({ description: 'University / College Name', example: 'IIT Delhi' })
  @IsString()
  college: string;

  @ApiPropertyOptional({ description: 'Expected Graduation Year', example: 2026 })
  @IsOptional()
  @IsNumber()
  graduationYear?: number;

  @ApiPropertyOptional({ description: 'Custom coupon / referral code override', example: 'KS-AARAV26' })
  @IsOptional()
  @IsString()
  customReferralCode?: string;
}

export class UpdateAmbassadorDto {
  @ApiPropertyOptional({ description: 'College / University Name' })
  @IsOptional()
  @IsString()
  college?: string;

  @ApiPropertyOptional({ description: 'Graduation Year' })
  @IsOptional()
  @IsNumber()
  graduationYear?: number;

  @ApiPropertyOptional({ description: 'Status (ACTIVE, INACTIVE, SUSPENDED)', default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class RecordReferralDto {
  @ApiProperty({ description: 'Ambassador Referral Code', example: 'KS-AARAV26' })
  @IsString()
  referralCode: string;

  @ApiProperty({ description: 'Referred Person ID (UUID)' })
  @IsUUID()
  referredPersonId: string;

  @ApiPropertyOptional({ description: 'Type of referral (LEAD, APPLICATION, CLIENT)', default: 'LEAD' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Reward / Commission amount for this referral', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardAmount?: number;
}

export class QueryAmbassadorDto {
  @ApiPropertyOptional({ description: 'Filter by college / university' })
  @IsOptional()
  @IsString()
  college?: string;

  @ApiPropertyOptional({ description: 'Filter by status (ACTIVE, INACTIVE)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search ambassador name or referral code' })
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
