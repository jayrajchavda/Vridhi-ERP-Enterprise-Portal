import { Request, Response } from 'express';
import { CustomerService } from './customer.service';
import { successResponse } from '../../utils/apiResponse';

export class CustomerController {
  static createCustomer = async (req: Request, res: Response) => {
    const customer = await CustomerService.createCustomer(req.body, (req as any).user!.id);
    res.status(201).json(successResponse(customer));
  };

  static getCustomers = async (req: Request, res: Response) => {
    const result = await CustomerService.getCustomers(req.query as any);
    res.json(successResponse(result.data, result.meta));
  };

  static getCustomerById = async (req: Request, res: Response) => {
    const customer = await CustomerService.getCustomerById(req.params.id);
    res.json(successResponse(customer));
  };

  static updateCustomer = async (req: Request, res: Response) => {
    const customer = await CustomerService.updateCustomer(req.params.id, req.body);
    res.json(successResponse(customer));
  };

  static deleteCustomer = async (req: Request, res: Response) => {
    const result = await CustomerService.deleteCustomer(req.params.id);
    res.json(successResponse(result));
  };

  static addNote = async (req: Request, res: Response) => {
    const note = await CustomerService.addNote(req.params.id, req.body, (req as any).user!.id);
    res.status(201).json(successResponse(note));
  };

  static getNotes = async (req: Request, res: Response) => {
    const notes = await CustomerService.getNotes(req.params.id);
    res.json(successResponse(notes));
  };

  static getFollowUps = async (req: Request, res: Response) => {
    const followUps = await CustomerService.getFollowUps(req.query.range as any);
    res.json(successResponse(followUps));
  };

  static createInteraction = async (req: Request, res: Response) => {
    const interaction = await CustomerService.createInteraction(
      req.params.id,
      req.body,
      (req as any).user!.id
    );
    res.status(201).json(successResponse(interaction));
  };

  static getInteractions = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await CustomerService.getInteractions(req.params.id, { page, limit });
    res.json(successResponse(result.data, result.meta));
  };
}
