import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Surface, Role, PricingModel, PricingConditionType } from '@prisma/client';

// ==========================================
// 1. SERVICE CATALOGUE DTOS
// ==========================================

export class CreateServiceItemDto {
  @ApiProperty({ example: 'Next.js Web Application Development' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'nextjs-web-application-development' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'End-to-end custom React/Next.js web platform built with TypeScript and Tailwind CSS.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Web Development' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 45000, description: 'Base starting price in INR' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: PricingModel, default: PricingModel.FIXED })
  @IsEnum(PricingModel)
  @IsOptional()
  pricingModel?: PricingModel;

  @ApiPropertyOptional({
    example: ['Responsive UI layout', 'REST API Integration', 'Deployment & CI/CD Pipeline', '30-Day Support'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deliverables?: string[];

  @ApiPropertyOptional({
    example: [Surface.SITE_COM, Surface.SITE_IN, Surface.APP],
    enum: Surface,
    isArray: true,
  })
  @IsArray()
  @IsEnum(Surface, { each: true })
  @IsOptional()
  surfaces?: Surface[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateServiceItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: PricingModel })
  @IsEnum(PricingModel)
  @IsOptional()
  pricingModel?: PricingModel;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deliverables?: string[];

  @ApiPropertyOptional({ enum: Surface, isArray: true })
  @IsArray()
  @IsEnum(Surface, { each: true })
  @IsOptional()
  surfaces?: Surface[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class QueryServiceItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: Surface })
  @IsEnum(Surface)
  @IsOptional()
  surface?: Surface;

  @ApiPropertyOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class CalculateQuoteDto {
  @ApiProperty({ description: 'ID or Slug of the service' })
  @IsString()
  @IsNotEmpty()
  serviceIdentifier: string;

  @ApiPropertyOptional({ enum: Surface, default: Surface.SITE_COM })
  @IsEnum(Surface)
  @IsOptional()
  surface?: Surface;

  @ApiPropertyOptional({ description: 'Units of work (hours, milestones, modules)', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  scopeUnits?: number;

  @ApiPropertyOptional({ description: 'Estimated customer budget in INR' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  budget?: number;
}

// ==========================================
// 2. PRICING RULES DTOS
// ==========================================

export class CreatePricingRuleDto {
  @ApiProperty({ example: 'Regional karyasaarthi.in 15% Launch Offer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Discounts starting base price for leads coming from karyasaarthi.in domain' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Specific service ID (null for global rule across all services)' })
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiProperty({ enum: PricingConditionType, example: PricingConditionType.SURFACE_PROMO })
  @IsEnum(PricingConditionType)
  conditionType: PricingConditionType;

  @ApiPropertyOptional({ example: 15.0, description: 'Percentage discount (e.g., 15 for 15%)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 10.0, description: 'Percentage markup for rush delivery or prime services' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  markupPercentage?: number;

  @ApiPropertyOptional({ example: 100000, description: 'Minimum budget required to trigger rule' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minBudget?: number;

  @ApiPropertyOptional({ enum: Surface, example: Surface.SITE_IN })
  @IsEnum(Surface)
  @IsOptional()
  targetSurface?: Surface;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdatePricingRuleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ enum: PricingConditionType })
  @IsEnum(PricingConditionType)
  @IsOptional()
  conditionType?: PricingConditionType;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  markupPercentage?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minBudget?: number;

  @ApiPropertyOptional({ enum: Surface })
  @IsEnum(Surface)
  @IsOptional()
  targetSurface?: Surface;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class QueryPricingRuleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ enum: PricingConditionType })
  @IsEnum(PricingConditionType)
  @IsOptional()
  conditionType?: PricingConditionType;

  @ApiPropertyOptional({ enum: Surface })
  @IsEnum(Surface)
  @IsOptional()
  targetSurface?: Surface;

  @ApiPropertyOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}

// ==========================================
// 3. SURFACE FEATURE FLAGS DTOS
// ==========================================

export class CreateFeatureFlagDto {
  @ApiProperty({ example: 'instant_chat_widget' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Real-time Omnichannel Live Chat Widget' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Toggles the embedded web chat bubble across public surfaces' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: Surface, description: 'Leave null to apply to all surfaces' })
  @IsEnum(Surface)
  @IsOptional()
  surface?: Surface;

  @ApiPropertyOptional({ example: 100, description: 'Percentage rollout (0-100)', default: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rolloutPercentage?: number;

  @ApiPropertyOptional({ example: { soundAlerts: true, autoPopupSeconds: 10 } })
  @IsOptional()
  config?: any;
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: Surface })
  @IsEnum(Surface)
  @IsOptional()
  surface?: Surface;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rolloutPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  config?: any;
}

export class QueryFeatureFlagDto {
  @ApiPropertyOptional({ enum: Surface })
  @IsEnum(Surface)
  @IsOptional()
  surface?: Surface;

  @ApiPropertyOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}

// ==========================================
// 4. PIPELINE ROUTING RULES DTOS
// ==========================================

export class CreateRoutingRuleDto {
  @ApiProperty({ example: 'High-Value Web Inquiries to Senior Sales' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Directs projects over ₹1 Lakh or with Web category directly to Priya' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 10, description: 'Higher numbers take precedence', default: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ enum: Surface, example: Surface.SITE_COM })
  @IsEnum(Surface)
  @IsOptional()
  sourceSurface?: Surface;

  @ApiPropertyOptional({ example: 'Web Development' })
  @IsString()
  @IsOptional()
  serviceCategory?: string;

  @ApiPropertyOptional({ example: 100000, description: 'Minimum estimated value in INR to match rule' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minEstimatedValue?: number;

  @ApiPropertyOptional({
    example: ['enterprise', 'urgent', 'saas', 'custom application'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywordMatch?: string[];

  @ApiPropertyOptional({ description: 'Specific staff ID to route to' })
  @IsString()
  @IsOptional()
  assignedStaffId?: string;

  @ApiPropertyOptional({ enum: Role, description: 'Fallback role if assignedStaffId is null', default: Role.SALES })
  @IsEnum(Role)
  @IsOptional()
  targetRole?: Role;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateRoutingRuleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ enum: Surface })
  @IsEnum(Surface)
  @IsOptional()
  sourceSurface?: Surface;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serviceCategory?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minEstimatedValue?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywordMatch?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedStaffId?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsEnum(Role)
  @IsOptional()
  targetRole?: Role;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class QueryRoutingRuleDto {
  @ApiPropertyOptional({ enum: Surface })
  @IsEnum(Surface)
  @IsOptional()
  sourceSurface?: Surface;

  @ApiPropertyOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class EvaluateLeadRoutingDto {
  @ApiProperty({ enum: Surface, example: Surface.SITE_COM })
  @IsEnum(Surface)
  sourceSurface: Surface;

  @ApiPropertyOptional({ example: 'Web Development' })
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiPropertyOptional({ example: 120000 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @ApiProperty({ example: 'Enterprise React Portal with High Scalability' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Need urgent deployment for Q4' })
  @IsString()
  @IsOptional()
  notes?: string;
}

