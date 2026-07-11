import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array().map(e => e.msg) });
    return;
  }
  next();
};

export const validateRegister = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('fullName').notEmpty().withMessage('Full name is required').trim(),
  handleValidationErrors,
];

export const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password cannot be empty'),
  handleValidationErrors,
];

export const validateResetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  handleValidationErrors,
];

export const validateOTP = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),
  handleValidationErrors,
];
