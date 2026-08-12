export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const successResponse = <T>(data: T, meta?: Record<string, any>): ApiResponse<T> => {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
};

export const errorResponse = (code: string, message: string, details?: any): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
};
