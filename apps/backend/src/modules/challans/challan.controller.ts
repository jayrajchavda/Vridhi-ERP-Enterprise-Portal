import { Request, Response } from 'express';
import { ChallanService } from './challan.service';
import { successResponse } from '../../utils/apiResponse';
import { PdfGenerator } from '../../utils/pdfGenerator';

export class ChallanController {
  static createChallan = async (req: Request, res: Response) => {
    const challan = await ChallanService.createChallan(req.body, (req as any).user!.id);
    res.status(201).json(successResponse(challan));
  };

  static getChallans = async (req: Request, res: Response) => {
    const result = await ChallanService.getChallans(req.query as any);
    res.json(successResponse(result.data, result.meta));
  };

  static getChallanById = async (req: Request, res: Response) => {
    const challan = await ChallanService.getChallanById(req.params.id);
    res.json(successResponse(challan));
  };

  static updateChallan = async (req: Request, res: Response) => {
    const challan = await ChallanService.updateChallan(req.params.id, req.body);
    res.json(successResponse(challan));
  };

  static confirmChallan = async (req: Request, res: Response) => {
    const challan = await ChallanService.confirmChallan(req.params.id, (req as any).user!.id);
    res.json(successResponse(challan));
  };

  static cancelChallan = async (req: Request, res: Response) => {
    const challan = await ChallanService.cancelChallan(req.params.id, (req as any).user!.id);
    res.json(successResponse(challan));
  };

  static getPdf = async (req: Request, res: Response) => {
    const challan = await ChallanService.getChallanById(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=challan-${challan.challanNumber}.pdf`);
    PdfGenerator.generateChallanPdf(challan, res);
  };
}
