import { Request, Response } from 'express';
import { InvoicesService } from './invoices.service';
import { successResponse } from '../../utils/apiResponse';
import { PdfGenerator } from '../../utils/pdfGenerator';

export class InvoicesController {
  static convertChallanToInvoice = async (req: Request, res: Response) => {
    const invoice = await InvoicesService.convertChallanToInvoice(req.params.id, (req as any).user!.id);
    res.status(201).json(successResponse(invoice));
  };

  static getInvoices = async (req: Request, res: Response) => {
    const result = await InvoicesService.getInvoices(req.query as any);
    res.json(successResponse(result.data, result.meta));
  };

  static getInvoiceById = async (req: Request, res: Response) => {
    const invoice = await InvoicesService.getInvoiceById(req.params.id);
    res.json(successResponse(invoice));
  };

  static recordPayment = async (req: Request, res: Response) => {
    const payment = await InvoicesService.recordPayment(req.params.id, req.body, (req as any).user!.id);
    res.status(201).json(successResponse(payment));
  };

  static getPaymentsForInvoice = async (req: Request, res: Response) => {
    const payments = await InvoicesService.getPaymentsForInvoice(req.params.id);
    res.json(successResponse(payments));
  };

  static getPdf = async (req: Request, res: Response) => {
    const invoice = await InvoicesService.getInvoiceById(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    PdfGenerator.generateInvoicePdf(invoice, res);
  };
}
