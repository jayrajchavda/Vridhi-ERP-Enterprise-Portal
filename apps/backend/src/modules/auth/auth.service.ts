import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { LoginInput } from './auth.schemas';
import { Role } from '../../types/domain';

export interface JwtPayload {
  userId: string;
  role: Role;
  email: string;
}

export class AuthService {
  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role as Role,
      email: user.email,
    };

    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as any,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, options);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }
}
