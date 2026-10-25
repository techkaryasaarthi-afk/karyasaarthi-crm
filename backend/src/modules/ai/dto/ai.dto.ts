import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScoreLeadDto {
  @ApiProperty({ description: 'Message or enquiry text submitted by lead', example: 'Looking to build a mobile app and web platform for our healthcare business. Budget around $15,000.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Service category requested', example: 'Mobile & Web Development' })
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiPropertyOptional({ description: 'Stated budget if available', example: '$15,000' })
  @IsString()
  @IsOptional()
  budget?: string;
}

export class DraftReplyDto {
  @ApiProperty({ description: 'Customer incoming message', example: 'Can you deliver the MVP in 4 weeks?' })
  @IsString()
  @IsNotEmpty()
  customerMessage: string;

  @ApiPropertyOptional({ description: 'Context regarding the project or history', example: 'Custom CRM platform with 3 milestones.' })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({ description: 'Desired tone of reply', example: 'professional, reassuring, and concise' })
  @IsString()
  @IsOptional()
  tone?: string;
}

export class SummarizeThreadDto {
  @ApiProperty({
    description: 'Array of conversation messages or full thread text',
    example: 'Client: We need to change the payment gateway to Razorpay.\nStaff: Understood, we can integrate Razorpay webhooks.',
  })
  @IsString()
  @IsNotEmpty()
  threadText: string;
}

export class MatchResumeDto {
  @ApiProperty({ description: 'Resume text or parsed CV content', example: 'Experienced Full Stack Engineer with 4 years in NestJS, React, PostgreSQL...' })
  @IsString()
  @IsNotEmpty()
  resumeText: string;

  @ApiProperty({ description: 'Job Title or Role Description', example: 'Full Stack Engineer (NestJS / Next.js)' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiPropertyOptional({ description: 'Job requirements or key skills', example: 'NestJS, TypeScript, PostgreSQL, REST/WebSockets' })
  @IsString()
  @IsOptional()
  jobRequirements?: string;
}
