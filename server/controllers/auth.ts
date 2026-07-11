import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAuditImmediate } from '../middleware/security';

const JWT_SECRET = process.env.JWT_SECRET || 'finsight_super_secret_jwt_key_2025';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'finsight_refresh_token_very_long_and_secure_key';

// Generate safe OTP code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        otpCode,
        otpExpiresAt,
        isVerified: false,
      },
    });

    // Output OTP for local sandbox testing
    console.log(`[SANDBOX OTP] Verification code for ${email}: ${otpCode}`);

    await logAuditImmediate(user.id, 'USER_REGISTERED_OTP_SENT', req);

    res.status(201).json({
      message: 'Registration successful! An OTP has been generated for verification.',
      email: user.email,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Account already verified' });
      return;
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpCode !== otp) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    if (new Date() > user.otpExpiresAt) {
      res.status(400).json({ error: 'Verification code has expired' });
      return;
    }

    // Verify user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    await logAuditImmediate(user.id, 'USER_EMAIL_VERIFIED', req);

    res.status(200).json({ message: 'Account verified successfully! You can now log in.' });
  } catch (error: any) {
    res.status(500).json({ error: 'OTP Verification failed' });
  }
};

export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiresAt },
    });

    console.log(`[SANDBOX OTP RESEND] New code for ${email}: ${otpCode}`);
    res.status(200).json({ message: 'Verification OTP resent successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        error: 'Please verify your email first',
        code: 'EMAIL_UNVERIFIED',
        email: user.email,
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshExpires = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: rememberMe ? '30d' : '1d' }
    );

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + refreshExpires),
      },
    });

    await logAuditImmediate(user.id, 'USER_LOGIN_SUCCESS', req);

    res.status(200).json({
      message: 'Logged in successfully',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        creditScore: user.creditScore,
        currency: user.currency,
        riskProfile: user.riskProfile,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const googleOAuthMock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, googleId } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Auto-register OAuth users as verified
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await prisma.user.create({
        data: {
          email,
          fullName: name || 'Google User',
          passwordHash: randomPassword,
          isVerified: true,
        },
      });
      await logAuditImmediate(user.id, 'USER_GOOGLE_OAUTH_REGISTER', req);
    } else {
      await logAuditImmediate(user.id, 'USER_GOOGLE_OAUTH_LOGIN', req);
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(200).json({
      message: 'Google login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        creditScore: user.creditScore,
        currency: user.currency,
        riskProfile: user.riskProfile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Google OAuth authentication failed' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    try {
      jwt.verify(refreshToken, REFRESH_SECRET);
    } catch {
      res.status(401).json({ error: 'Invalid signature on refresh token' });
      return;
    }

    // Generate a new access token
    const accessToken = jwt.sign(
      { id: session.user.id, email: session.user.email, role: session.user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({ accessToken });
  } catch (error: any) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken } });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Avoid enum leak for security
      res.status(200).json({ message: 'If that email is registered, a reset link has been dispatched.' });
      return;
    }

    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpiresAt },
    });

    console.log(`[SANDBOX PASSWORD RESET] URL: http://localhost:3000/reset-password?token=${resetToken}`);

    res.status(200).json({ message: 'If that email is registered, a reset link has been dispatched.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to request password reset' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      res.status(400).json({ error: 'Invalid or expired password reset token' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        resetToken: token,
        resetExpiresAt: { gte: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ error: 'Reset link has already been used or has expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpiresAt: null,
      },
    });

    await logAuditImmediate(user.id, 'USER_PASSWORD_RESET_SUCCESS', req);

    res.status(200).json({ message: 'Your password has been reset successfully. You can now log in.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Reset password failed' });
  }
};

// Profile & Security Operations
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        creditScore: true,
        currency: true,
        riskProfile: true,
        createdAt: true,
      },
    });
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fullName, currency, riskProfile } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user?.id },
      data: {
        fullName,
        currency,
        riskProfile,
      },
    });

    await logAuditImmediate(req.user?.id || null, 'USER_PROFILE_UPDATED', req);

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        creditScore: updated.creditScore,
        currency: updated.currency,
        riskProfile: updated.riskProfile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await logAuditImmediate(user.id, 'USER_PASSWORD_CHANGED', req);

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.delete({ where: { id: req.user?.id } });
    res.status(200).json({ message: 'Account permanently deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
