import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AppStage } from '@prisma/client';

export { AppStage };

export class CreateJobPostingDto {
  @ApiProperty({ description: 'Job Title', example: 'Senior Fullstack Engineer (NestJS / React)' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Department', default: 'Engineering', example: 'Engineering' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Office Location or Remote', default: 'Remote' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Employment Type', default: 'FULL_TIME', example: 'FULL_TIME' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Experience Required', example: '3-5 years' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ description: 'Salary Range', example: '₹12,00,000 - ₹18,00,000 P.A.' })
  @IsOptional()
  @IsString()
  salaryRange?: string;

  @ApiPropertyOptional({ description: 'Role Description & Responsibilities' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of core candidate requirements',
    example: ['Proficient in TypeScript and NestJS', 'Experience with PostgreSQL & Prisma', 'Familiarity with Claude AI APIs'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ description: 'Whether the position is currently accepting applications', default: true })
  @IsOptional()
  @IsBoolean()
  open?: boolean;
}

export class UpdateJobPostingDto {
  @ApiPropertyOptional({ description: 'Job Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Office Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Employment Type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Experience Required' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ description: 'Salary Range' })
  @IsOptional()
  @IsString()
  salaryRange?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Requirements array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ description: 'Job Open Status' })
  @IsOptional()
  @IsBoolean()
  open?: boolean;
}

export class SubmitApplicationDto {
  @ApiProperty({ description: 'Job Posting Role ID (UUID)' })
  @IsUUID()
  roleId: string;

  @ApiProperty({ description: 'Applicant Person ID (UUID)' })
  @IsUUID()
  personId: string;

  @ApiPropertyOptional({ description: 'Resume PDF cloud storage URL or direct link' })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional({ description: 'GitHub / Portfolio URL' })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ description: 'Candidate years of relevant experience', example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Candidate skill tags',
    example: ['NestJS', 'React', 'Docker', 'AWS'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Resume plain text summary for Claude Sonnet AI evaluation' })
  @IsOptional()
  @IsString()
  resumeText?: string;

  @ApiPropertyOptional({ description: 'Campus Ambassador referral code / coupon' })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class UpdateApplicationStageDto {
  @ApiProperty({ enum: AppStage, description: 'Updated ATS hiring stage' })
  @IsEnum(AppStage)
  stage: AppStage;

  @ApiPropertyOptional({ description: 'Staff reviewer notes or screening remarks' })
  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}

export class ScheduleInterviewDto {
  @ApiProperty({ description: 'Scheduled interview ISO timestamp' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Interview meeting link or instructions' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateOfferDto {
  @ApiProperty({ description: 'Offered annual CTC in currency units', example: 1400000 })
  @IsNumber()
  @Min(0)
  offerAmount: number;

  @ApiPropertyOptional({ description: 'Offer letter terms or notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryJobPostingDto {
  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter open/closed positions' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  open?: boolean;

  @ApiPropertyOptional({ description: 'Search job title or location' })
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

export class QueryApplicationDto {
  @ApiPropertyOptional({ description: 'Filter by Job Posting Role ID' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ enum: AppStage, description: 'Filter by candidate stage' })
  @IsOptional()
  @IsEnum(AppStage)
  stage?: AppStage;

  @ApiPropertyOptional({ description: 'Filter candidate minimum Claude Sonnet match score', example: 75 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minMatchScore?: number;

  @ApiPropertyOptional({ description: 'Search candidate name or email' })
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
