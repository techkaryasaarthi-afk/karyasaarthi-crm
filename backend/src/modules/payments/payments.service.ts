import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import {
  CreateInvoiceDto,
  RecordPaymentDto,
  QueryInvoiceDto,
  InvoiceStatus,
  PaymentMethod,
} from './dto/payment.dto';
import { Surface, InteractionType } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionsService: InteractionsService,
  ) {}

  async createInvoice(dto: CreateInvoiceDto) {
    const client = await this.prisma.person.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client Person with ID "${dto.clientId}" not found`);
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID "${dto.projectId}" not found`);
      }
    }

    // Auto-generate invoice number (INV-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${currentYear}-${String(count + 1001).padStart(5, '0')}`;

    const subtotal = Number(dto.subtotal);
    const taxAmount = Number(dto.taxAmount || 0);
    const totalAmount = subtotal + taxAmount;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: dto.clientId,
        projectId: dto.projectId || null,
        milestoneId: dto.milestoneId || null,
        title: dto.title,
        description: dto.description,
        subtotal,
        taxAmount,
        totalAmount,
        currency: dto.currency || 'INR',
        status: InvoiceStatus.PENDING,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        project: {
          select: { id: true, title: true, serviceType: true },
        },
      },
    });

    await this.interactionsService.create({
      personId: client.id,
      channel: Surface.APP,
      type: InteractionType.FORM,
      payload: {
        event: 'INVOICE_GENERATED',
        summary: `Invoice ${invoice.invoiceNumber} generated: ₹${invoice.totalAmount} for "${invoice.title}"`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
      },
    });

    return invoice;
  }

  async findAllInvoices(query: QueryInvoiceDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.clientId) where.clientId = query.clientId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        {
          client: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          project: {
            select: { id: true, title: true, serviceType: true },
          },
          payments: {
            select: { id: true, amount: true, method: true, capturedAt: true },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneInvoice(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        project: {
          select: { id: true, title: true, serviceType: true, stage: true },
        },
        payments: {
          orderBy: { capturedAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with identifier "${id}" not found`);
    }

    return invoice;
  }

  async createRazorpayOrder(invoiceId: string) {
    const invoice = await this.findOneInvoice(invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(`Invoice ${invoice.invoiceNumber} is already paid`);
    }

    // Generated simulated / live order payload
    const orderId = `order_ks_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { gatewayOrderId: orderId },
    });

    return {
      orderId,
      amount: Math.round(invoice.totalAmount * 100), // in paise
      currency: invoice.currency,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.client.fullName,
      clientEmail: invoice.client.email,
      description: invoice.title,
    };
  }

  async recordPayment(dto: RecordPaymentDto) {
    const invoice = await this.findOneInvoice(dto.invoiceId);

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: dto.amount,
        currency: dto.currency || invoice.currency,
        method: dto.method || PaymentMethod.RAZORPAY,
        transactionRef: dto.transactionRef,
        gatewayPaymentId: dto.gatewayPaymentId,
        status: 'SUCCESS',
        notes: dto.notes,
      },
    });

    // Mark invoice as PAID
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
      include: {
        client: true,
        project: true,
      },
    });

    // If linked to a Project Milestone, update milestone status to IN_PROGRESS or COMPLETED
    if (invoice.milestoneId) {
      try {
        await this.prisma.projectMilestone.update({
          where: { id: invoice.milestoneId },
          data: { status: 'IN_PROGRESS' as any },
        });
      } catch (err: any) {
        this.logger.warn(`Could not update milestone status: ${err.message}`);
      }
    }

    await this.interactionsService.create({
      personId: invoice.clientId,
      channel: Surface.APP,
      type: InteractionType.FORM,
      payload: {
        event: 'PAYMENT_RECEIVED',
        summary: `Payment received: ₹${payment.amount} via ${payment.method} for Invoice ${invoice.invoiceNumber}`,
        invoiceId: invoice.id,
        paymentId: payment.id,
        amount: payment.amount,
      },
    });

    return {
      payment,
      invoice: updatedInvoice,
    };
  }

  async getClientInvoices(clientId: string) {
    const client = await this.prisma.person.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client Person with ID "${clientId}" not found`);
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, title: true, serviceType: true } },
        payments: { select: { id: true, amount: true, method: true, capturedAt: true } },
      },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingReceivables = totalInvoiced - totalPaid;

    return {
      client: { id: client.id, fullName: client.fullName, email: client.email },
      totalInvoiced,
      totalPaid,
      pendingReceivables,
      invoices,
    };
  }
}
