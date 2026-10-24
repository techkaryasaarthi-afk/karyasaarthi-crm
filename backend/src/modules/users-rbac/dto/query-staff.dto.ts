import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class QueryStaffDto {
  @ApiPropertyOptional({ enum: Role, description: 'Filter by staff role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Search term for name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
