import { Request, Response } from 'express';
import { ProcurementService } from './procurement.service';
import { successResponse } from '../../utils/apiResponse';
import { PdfGenerator } from '../../utils/pdfGenerator';

export class ProcurementController {
  // --- Vendor Controllers ---
  static createVendor = async (req: Request, res: Response) => {
    const vendor = await ProcurementService.createVendor(req.body);
    res.status(201).json(successResponse(vendor));
  };

  static getVendors = async (req: Request, res: Response) => {
    const result = await ProcurementService.getVendors(req.query as any);
    res.json(successResponse(result.data, result.meta));
  };

  static getVendorById = async (req: Request, res: Response) => {
    const vendor = await ProcurementService.getVendorById(req.params.id);
    res.json(successResponse(vendor));
  };

  static updateVendor = async (req: Request, res: Response) => {
    const vendor = await ProcurementService.updateVendor(req.params.id, req.body);
    res.json(successResponse(vendor));
  };

  // --- Purchase Order Controllers ---
  static getReorderSuggestions = async (_req: Request, res: Response) => {
    const suggestions = await ProcurementService.getReorderSuggestions();
    res.json(successResponse(suggestions));
  };

  static createPurchaseOrder = async (req: Request, res: Response) => {
    const po = await ProcurementService.createPurchaseOrder(req.body, (req as any).user!.id);
    res.status(201).json(successResponse(po));
  };

  static getPurchaseOrders = async (req: Request, res: Response) => {
    const result = await ProcurementService.getPurchaseOrders(req.query as any);
    res.json(successResponse(result.data, result.meta));
  };

  static getPurchaseOrderById = async (req: Request, res: Response) => {
    const po = await ProcurementService.getPurchaseOrderById(req.params.id);
    res.json(successResponse(po));
  };

  static sendPurchaseOrder = async (req: Request, res: Response) => {
    const po = await ProcurementService.sendPurchaseOrder(req.params.id);
    res.json(successResponse(po));
  };

  static cancelPurchaseOrder = async (req: Request, res: Response) => {
    const po = await ProcurementService.cancelPurchaseOrder(req.params.id);
    res.json(successResponse(po));
  };

  // --- Purchase Receipt Controllers ---
  static createPurchaseReceipt = async (req: Request, res: Response) => {
    const receipt = await ProcurementService.createPurchaseReceipt(req.body, (req as any).user!.id);
    res.status(201).json(successResponse(receipt));
  };

  static getPurchaseReceipts = async (req: Request, res: Response) => {
    const result = await ProcurementService.getPurchaseReceipts(req.query as any);
    res.json(successResponse(result.data, result.meta));
  };

  static getPurchaseReceiptById = async (req: Request, res: Response) => {
    const receipt = await ProcurementService.getPurchaseReceiptById(req.params.id);
    res.json(successResponse(receipt));
  };

  static getPoPdf = async (req: Request, res: Response) => {
    const po = await ProcurementService.getPurchaseOrderById(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=po-${po.poNumber}.pdf`);
    PdfGenerator.generatePurchaseOrderPdf(po, res);
  };
}
