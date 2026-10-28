import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import {
  CreateInvoiceDto,
  RecordPaymentDto,
  QueryInvoiceDto,
} from './dto/payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Invoicing & Payments Gateway')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Generate client invoice',
    description: 'Creates formatted GST invoice linked to client Person and optional Project Milestone.',
  })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.paymentsService.createInvoice(dto);
  }

  @Get('invoices')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Query invoices list with filters and status' })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  findAllInvoices(@Query() query: QueryInvoiceDto) {
    return this.paymentsService.findAllInvoices(query);
  }

  @Get('invoices/client/:clientId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({
    summary: 'Client Portal Invoice History',
    description: 'Retrieves client billing statement with total invoiced, total paid, and pending receivables.',
  })
  @ApiResponse({ status: 200, description: 'Client billing statement' })
  getClientInvoices(@Param('clientId') clientId: string) {
    return this.paymentsService.getClientInvoices(clientId);
  }

  @Get('invoices/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({ summary: 'Get detailed invoice card and payment history' })
  @ApiResponse({ status: 200, description: 'Invoice card details' })
  findOneInvoice(@Param('id') id: string) {
    return this.paymentsService.findOneInvoice(id);
  }

  @Post('invoices/:id/order')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.VIEWER)
  @ApiOperation({
    summary: 'Create Razorpay payment gateway order',
    description: 'Generates Razorpay order payload for client checkout.',
  })
  @ApiResponse({ status: 200, description: 'Razorpay order created' })
  createRazorpayOrder(@Param('id') id: string) {
    return this.paymentsService.createRazorpayOrder(id);
  }

  @Post('record')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Record payment transaction',
    description: 'Records payment received, marks invoice as PAID, and unlocks linked project milestone.',
  })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.paymentsService.recordPayment(dto);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'Payment gateway webhook listener',
    description: 'Receives asynchronous payment notifications from Razorpay / Stripe.',
  })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged' })
  handleWebhook(@Body() payload: any) {
    return { status: 'acknowledged', receivedAt: new Date().toISOString() };
  }
}
