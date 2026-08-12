import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/AppError';
import { GstService } from './gst.service';
import { QueryInvoiceInput, CreatePaymentInput } from './invoices.schemas';
import { EmailService } from '../../services/email.service';
import { pdfToBuffer } from '../../utils/pdfToBuffer';
import { PdfGenerator } from '../../utils/pdfGenerator';

export class InvoicesService {
  private static async generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const lastInv = await tx.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let seq = 1;
    if (lastInv) {
      const parts = lastInv.invoiceNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1;
        }
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  static async convertChallanToInvoice(challanId: string, userId: string) {
    const challan = await prisma.salesChallan.findUnique({
      where: { id: challanId },
      include: {
        items: {
          include: {
            product: { select: { gstRate: true } },
          },
        },
        customer: { select: { id: true, state: true } },
      },
    });

    if (!challan) {
      throw new AppError(404, 'CHALLAN_NOT_FOUND', `Sales challan with ID '${challanId}' not found`);
    }

    if (challan.status !== 'CONFIRMED') {
      throw new AppError(409, 'CHALLAN_NOT_CONFIRMED', `Sales challan status is '${challan.status}' and must be CONFIRMED before invoicing`);
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { challanId },
      select: { id: true },
    });

    if (existingInvoice) {
      throw new AppError(409, 'INVOICE_ALREADY_EXISTS', 'An invoice has already been generated for this sales challan', {
        invoiceId: existingInvoice.id,
      });
    }

    // Map items for GST service
    const gstItems = challan.items.map((item) => ({
      amount: item.lineTotal,
      gstRate: item.product.gstRate,
    }));

    const gstResults = GstService.calculateGst(challan.customer.state, gstItems);

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(tx);

      return tx.invoice.create({
        data: {
          invoiceNumber,
          challanId: challan.id,
          customerId: challan.customerId,
          subtotal: gstResults.subtotal,
          cgstAmount: gstResults.cgstAmount,
          sgstAmount: gstResults.sgstAmount,
          igstAmount: gstResults.igstAmount,
          totalAmount: gstResults.totalAmount,
          status: 'UNPAID',
          createdById: userId,
        },
        include: {
          customer: true,
          challan: {
            include: {
              items: true,
            },
          },
        },
      });
    });

    // Trigger Email (Non-blocking background call)
    if (invoice.customer.email) {
      pdfToBuffer((stream) => PdfGenerator.generateInvoicePdf(invoice, stream))
        .then((buffer) => {
          EmailService.sendEmail({
            to: invoice.customer.email!,
            subject: `Tax Invoice Generated: ${invoice.invoiceNumber}`,
            text: `Dear Customer,\n\nYour invoice ${invoice.invoiceNumber} has been generated. Please find the payment invoice details attached.\n\nRegards,\nNexusFlow Team`,
            relatedType: 'INVOICE',
            relatedId: invoice.id,
            attachments: [
              {
                filename: `invoice-${invoice.invoiceNumber}.pdf`,
                content: buffer,
                contentType: 'application/pdf',
              },
            ],
          });
        })
        .catch((err) => {
          console.error('❌ [InvoicesService] Failed to generate PDF buffer for email:', err);
        });
    }

    return invoice;
  }

  static async getInvoices(query: QueryInvoiceInput) {
    const { page, limit, status, customerId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [total, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, mobile: true, businessName: true } },
          challan: { select: { id: true, challanNumber: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        challan: {
          include: {
            items: true,
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        payments: {
          orderBy: { paidAt: 'desc' },
          include: {
            recordedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', `Invoice with ID '${id}' not found`);
    }

    // Check if any product line has unconfigured GST rate
    const itemsWithNoGst = invoice.challan.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: itemsWithNoGst } },
      select: { id: true, gstRate: true },
    });

    const hasUnconfiguredGst = products.some((p) => p.gstRate === null);

    return {
      ...invoice,
      hasUnconfiguredGst,
    };
  }

  static async recordPayment(invoiceId: string, input: CreatePaymentInput, userId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', `Invoice with ID '${invoiceId}' not found`);
    }

    const currentPaidSum = invoice.payments.reduce(
      (sum, p) => sum.add(p.amount),
      new Prisma.Decimal(0)
    );

    const paymentAmount = new Prisma.Decimal(input.amount);
    const newPaidSum = currentPaidSum.add(paymentAmount);
    const totalAmount = new Prisma.Decimal(invoice.totalAmount);

    if (newPaidSum.gt(totalAmount)) {
      const remainingBalance = totalAmount.sub(currentPaidSum);
      throw new AppError(
        409,
        'OVERPAYMENT',
        `Payment of ${paymentAmount.toString()} exceeds the remaining balance of ${remainingBalance.toString()}`,
        { remainingBalance: remainingBalance.toNumber() }
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          method: input.method,
          paidAt: new Date(input.paidAt),
          recordedById: userId,
        },
      });

      // 2. Recompute status
      let newStatus = 'UNPAID';
      if (newPaidSum.equals(totalAmount)) {
        newStatus = 'PAID';
      } else if (newPaidSum.gt(0)) {
        newStatus = 'PARTIALLY_PAID';
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });

      return payment;
    });
  }

  static async getPaymentsForInvoice(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', `Invoice with ID '${invoiceId}' not found`);
    }

    return prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });
  }
}
