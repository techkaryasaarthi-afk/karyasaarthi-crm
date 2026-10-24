import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current account password' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  oldPassword: string;

  @ApiProperty({ description: 'New password (minimum 6 characters)' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}
