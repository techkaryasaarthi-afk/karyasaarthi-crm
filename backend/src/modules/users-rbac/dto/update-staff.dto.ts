import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Updated full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.MANAGER,
    description: 'Updated role',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: true, description: 'Active / Deactivated status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'NewPassword123!', description: 'Reset password' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
