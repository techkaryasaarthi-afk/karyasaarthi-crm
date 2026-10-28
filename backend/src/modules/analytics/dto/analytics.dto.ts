import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Number of past days to aggregate analytics for', default: 30, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days?: number;
}
