import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/db';

// Rate Limiter middleware
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter for login/register
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Audit logger middleware helper
export const logAudit = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function (body) {
      const userId = (req as any).user?.id || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      // Asynchronously log audit record
      prisma.auditLog.create({
        data: {
          userId,
          action: `${action} [Status: ${res.statusCode}]`,
          ipAddress,
          userAgent,
        },
      }).catch((err) => console.error('Audit Logging failed:', err));

      return originalSend.call(this, body);
    };
    next();
  };
};

// Immediate logger helper for backend tasks (not middleware)
export const logAuditImmediate = async (
  userId: string | null,
  action: string,
  req?: Request
) => {
  try {
    const ipAddress = req ? (req.ip || req.socket.remoteAddress) : null;
    const userAgent = req ? (req.headers['user-agent'] || null) : null;
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Immediate Audit Logging failed:', error);
  }
};
