import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Surface } from '@prisma/client';

export { Surface };

export class CreateBlogPostDto {
  @ApiProperty({ description: 'Title of the blog post' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Custom URL slug (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Short excerpt or meta description' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ description: 'Markdown or HTML body content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tags or categories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: Surface, default: Surface.SITE_COM })
  @IsOptional()
  @IsEnum(Surface)
  surface?: Surface;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}

export class CreateCaseStudyDto {
  @ApiProperty({ description: 'Case study title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Custom URL slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: 'Client or brand name' })
  @IsString()
  clientName: string;

  @ApiProperty({ description: 'Service or domain (e.g. Web Development, AI Automation)' })
  @IsString()
  serviceType: string;

  @ApiProperty({ description: 'In-depth description of the project challenge & solution' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Quantifiable outcome metrics (e.g. ROI, turnaround)' })
  @IsOptional()
  @IsObject()
  outcomeMetrics?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tech stack or industry tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateCaseStudyDto extends PartialType(CreateCaseStudyDto) {}

export class CreateTestimonialDto {
  @ApiProperty({ description: 'Client or stakeholder name' })
  @IsString()
  clientName: string;

  @ApiPropertyOptional({ description: 'Client designation/role' })
  @IsOptional()
  @IsString()
  clientRole?: string;

  @ApiPropertyOptional({ description: 'Client company or brand' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Avatar or logo image URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiProperty({ description: 'Testimonial / review text' })
  @IsString()
  reviewText: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ enum: Surface, default: Surface.SITE_COM })
  @IsOptional()
  @IsEnum(Surface)
  surface?: Surface;
}

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {}

export class QueryContentDto {
  @ApiPropertyOptional({ enum: Surface })
  @IsOptional()
  @IsEnum(Surface)
  surface?: Surface;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  published?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
