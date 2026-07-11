import { Router } from 'express';
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  googleOAuthMock,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/auth';
import { authenticateJWT } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';
import {
  validateRegister,
  validateLogin,
  validateOTP,
  validateResetPassword,
} from '../validators/auth';

const router = Router();

// Public auth endpoints
router.post('/register', authRateLimiter, validateRegister, register);
router.post('/verify-otp', authRateLimiter, validateOTP, verifyOTP);
router.post('/resend-otp', authRateLimiter, resendOTP);
router.post('/login', authRateLimiter, validateLogin, login);
router.post('/oauth/google', authRateLimiter, googleOAuthMock);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, validateResetPassword, resetPassword);

// Protected profile/settings endpoints
router.get('/profile', authenticateJWT as any, getProfile as any);
router.put('/profile', authenticateJWT as any, updateProfile as any);
router.put('/change-password', authenticateJWT as any, changePassword as any);
router.delete('/delete-account', authenticateJWT as any, deleteAccount as any);

export default router;
