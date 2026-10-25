import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Surface } from '@prisma/client';

export class PublicEnquiryDto {
  @ApiProperty({ description: 'Full name of the inquirer', example: 'Pooja Verma' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ description: 'Contact email', example: 'pooja.verma@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number with country code', example: '+919988776655' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    enum: Surface,
    description: 'Source surface of the enquiry',
    example: Surface.SITE_COM,
  })
  @IsEnum(Surface)
  surface: Surface;

  @ApiPropertyOptional({ description: 'Service requested', example: 'Full Stack Web Platform' })
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiProperty({ description: 'Project description / enquiry message', example: 'We need an enterprise CRM built with real-time chat and multi-channel intake.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Stated budget range', example: '$20,000 - $30,000' })
  @IsString()
  @IsOptional()
  budget?: string;

  @ApiPropertyOptional({
    description: 'Consent for communication and terms',
    example: { marketingConsent: true, termsAccepted: true },
  })
  @IsObject()
  @IsOptional()
  consentFlags?: Record<string, any>;
}

export class PublicChatDto {
  @ApiPropertyOptional({ description: 'Name of the visitor', example: 'Anonymous Visitor' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email if provided in chat pre-form', example: 'visitor@company.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number if provided', example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: Surface, description: 'Channel (SITE_COM, SITE_IN, APP, WHATSAPP)' })
  @IsEnum(Surface)
  channel: Surface;

  @ApiProperty({ description: 'Chat message text', example: 'Hi! Do you offer mobile app development?' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class PublicApplicationDto {
  @ApiProperty({ description: 'Applicant full name', example: 'Aman Patel' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Applicant email address', example: 'aman.patel@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Applicant phone number', example: '+919123456789' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Job Posting ID being applied for' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: 'Resume file URL or CloudFront link', example: 'https://cdn.karyasaarthi.com/resumes/aman_patel_cv.pdf' })
  @IsString()
  @IsNotEmpty()
  resumeUrl: string;

  @ApiPropertyOptional({ description: 'Cover note or portfolio links', example: 'Github: github.com/aman-dev, Portfolio: aman.me' })
  @IsString()
  @IsOptional()
  coverNote?: string;
}
