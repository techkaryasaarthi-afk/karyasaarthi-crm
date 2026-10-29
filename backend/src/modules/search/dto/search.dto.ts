import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Surface } from '@prisma/client';

export enum SearchableEntity {
  LEADS = 'leads',
  PROJECTS = 'projects',
  APPLICATIONS = 'applications',
  PERSONS = 'persons',
  SERVICES = 'services',
  INVOICES = 'invoices',
  STAFF = 'staff',
}

export class GlobalSearchQueryDto {
  @ApiProperty({ description: 'Search keyword (min 2 characters)', example: 'Enterprise' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;

  @ApiPropertyOptional({
    description: 'Filter specific entity types (comma-separated or array)',
    enum: SearchableEntity,
    isArray: true,
    example: [SearchableEntity.LEADS, SearchableEntity.PROJECTS, SearchableEntity.PERSONS],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim().toLowerCase());
    }
    return value;
  })
  @IsArray()
  @IsEnum(SearchableEntity, { each: true })
  entities?: SearchableEntity[];

  @ApiPropertyOptional({ enum: Surface, description: 'Filter by originating surface' })
  @IsEnum(Surface)
  @IsOptional()
  surface?: Surface;

  @ApiPropertyOptional({ description: 'Max items per entity category', default: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(25)
  @IsOptional()
  limit?: number;
}

export class QuickSearchQueryDto {
  @ApiProperty({ description: 'Quick jump search term', example: 'Priya' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({ description: 'Max total quick results', default: 8 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  entityType: SearchableEntity;
  title: string;
  subtitle: string;
  badge: string;
  status?: string;
  url: string;
  surface?: Surface;
  relevanceScore: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  categories: {
    leads: SearchResultItem[];
    projects: SearchResultItem[];
    applications: SearchResultItem[];
    persons: SearchResultItem[];
    services: SearchResultItem[];
    invoices: SearchResultItem[];
    staff: SearchResultItem[];
  };
  flatResults: SearchResultItem[];
}

