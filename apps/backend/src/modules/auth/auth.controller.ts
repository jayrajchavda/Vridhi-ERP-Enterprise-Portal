import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../utils/apiResponse';

export class AuthController {
  static login = async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    res.json(successResponse(result));
  };

  static logout = async (_req: Request, res: Response) => {
    // Stateless JWT — response acknowledges logout
    res.json(successResponse({ message: 'Logged out successfully' }));
  };

  static me = async (req: Request, res: Response) => {
    res.json(successResponse((req as any).user));
  };
}
