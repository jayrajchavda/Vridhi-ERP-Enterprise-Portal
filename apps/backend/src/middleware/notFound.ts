import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/apiResponse';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json(errorResponse('NOT_FOUND', `Route ${req.originalUrl} not found`));
};
