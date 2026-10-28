import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

export { InvoiceStatus, PaymentMethod };

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Client Person ID (UUID)' })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ description: 'Associated Project ID (UUID)' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Associated Project Milestone ID (UUID)' })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiProperty({ description: 'Invoice Title / Summary', example: 'Milestone 1 Payment: Architecture & Prototype' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed invoice line items or notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Subtotal amount before tax', example: 50000 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Applicable GST/tax amount', default: 0, example: 9000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Currency ISO Code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment due date ISO timestamp' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'Invoice ID (UUID)' })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ description: 'Payment amount received', example: 59000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency ISO Code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.RAZORPAY })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: 'External transaction reference / Bank UTR' })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'Gateway Payment ID (e.g. pay_xxx)' })
  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;

  @ApiPropertyOptional({ description: 'Payment receipt remarks or accounting notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'Invoice ID (UUID) to generate payment link for' })
  @IsUUID()
  invoiceId: string;
}

export class VerifyRazorpayWebhookDto {
  @ApiProperty({ description: 'Razorpay Order ID' })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ description: 'Razorpay Payment ID' })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({ description: 'HMAC SHA256 Signature from Razorpay' })
  @IsString()
  razorpaySignature: string;
}

export class QueryInvoiceDto {
  @ApiPropertyOptional({ description: 'Filter by Client Person ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, description: 'Filter by invoice payment status' })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Search invoice title or invoice number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
