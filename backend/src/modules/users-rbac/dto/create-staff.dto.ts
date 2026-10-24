import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateStaffDto {
  @ApiProperty({ example: 'Rahul Sharma', description: 'Staff member full name' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  name: string;

  @ApiProperty({ example: 'rahul@karyasaarthi.com', description: 'Unique staff email' })
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Initial account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    enum: Role,
    example: Role.SALES,
    description: 'Role assigned to staff member (ADMIN, MANAGER, SALES, VENDOR, VIEWER)',
  })
  @IsEnum(Role, { message: 'Role must be one of: ADMIN, MANAGER, SALES, VENDOR, VIEWER' })
  role: Role;
}
