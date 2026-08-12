import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { errorResponse } from '../utils/apiResponse';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected server error occurred';
  let details = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle unique constraint violations from Prisma
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'DUPLICATE_ENTRY';
      message = `A record with this value already exists`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'The requested record was not found';
    } else {
      statusCode = 400;
      code = 'DATABASE_ERROR';
      message = 'A database error occurred';
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Invalid data provided to the database';
  }

  console.error(`[Error Handler] ${code} (${statusCode}): ${message}`, err.stack || err);

  res.status(statusCode).json(errorResponse(code, message, details));
};
