import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { successResponse } from '../../utils/apiResponse';

export class ProductController {
  static createProduct = async (req: Request, res: Response) => {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json(successResponse(product));
  };

  static getProducts = async (req: Request, res: Response) => {
    const result = await ProductService.getProducts(req.query as any);
    res.json(successResponse(result.data, result.meta));
  };

  static getLowStockProducts = async (_req: Request, res: Response) => {
    const products = await ProductService.getLowStockProducts();
    res.json(successResponse(products));
  };

  static getProductById = async (req: Request, res: Response) => {
    const product = await ProductService.getProductById(req.params.id);
    res.json(successResponse(product));
  };

  static updateProduct = async (req: Request, res: Response) => {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    res.json(successResponse(product));
  };

  static logStockMovement = async (req: Request, res: Response) => {
    const updatedProduct = await ProductService.logStockMovement(
      req.params.id,
      req.body,
      (req as any).user!.id
    );
    res.json(successResponse(updatedProduct));
  };

  static getProductStockMovements = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await ProductService.getProductStockMovements(req.params.id, page, limit);
    res.json(successResponse(result.data, result.meta));
  };
}
