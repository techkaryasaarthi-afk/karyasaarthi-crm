import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsEmail,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, CommsDeliveryStatus } from '@prisma/client';

export class SendEmailDto {
  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Your Karya Saarthi Project Invoice Receipt' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: '<p>Thank you for your payment!</p>' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'PAYMENT_RECEIPT' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ description: 'Optional Person ID to check consentFlags' })
  @IsString()
  @IsOptional()
  recipientPersonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

export class SendWhatsAppDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  toPhone: string;

  @ApiProperty({ example: 'Hello Rohan, your project milestone has been completed.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'MILESTONE_ALERT' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ description: 'Optional Person ID to check consentFlags' })
  @IsString()
  @IsOptional()
  recipientPersonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

export class SendPushDto {
  @ApiProperty({ description: 'Staff or Client Person ID' })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ example: '🚨 SLA Breach Alert' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '15-min SLA deadline passed for lead inquiry.' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: '/inbox?id=123' })
  @IsString()
  @IsOptional()
  deepLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: any;
}

export class SendSmsDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  toPhone: string;

  @ApiProperty({ example: 'Your Karya Saarthi OTP is 482910.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Optional Person ID to check consentFlags' })
  @IsString()
  @IsOptional()
  recipientPersonId?: string;
}

export class MultiChannelDispatchDto {
  @ApiProperty({
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP, NotificationChannel.PUSH],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Target Person ID' })
  @IsString()
  @IsOptional()
  recipientPersonId?: string;

  @ApiPropertyOptional({ description: 'Recipient Email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Recipient Phone (+91...)' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Project Update' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your latest deliverable is ready for review.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'PROJECT_UPDATE' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

export class QueryCommsLogDto {
  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel;

  @ApiPropertyOptional({ enum: CommsDeliveryStatus })
  @IsEnum(CommsDeliveryStatus)
  @IsOptional()
  status?: CommsDeliveryStatus;

  @ApiPropertyOptional({ description: 'Search email or phone' })
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
