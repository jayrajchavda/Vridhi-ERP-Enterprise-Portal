import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/domain';
import { AppError } from '../utils/AppError';

export const authorize = (...allowedRoles: (Role | string)[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'User context not authenticated'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Role '${user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};
