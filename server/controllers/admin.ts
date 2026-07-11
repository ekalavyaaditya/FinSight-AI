import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';

export const getAdminStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const verifiedUsers = await prisma.user.count({ where: { isVerified: true } });
    const totalTransactions = await prisma.transaction.count();
    const totalGoals = await prisma.savingsGoal.count();
    const activeSessions = await prisma.session.count();

    // Query most recent audit log history
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { email: true, fullName: true },
        },
      },
    });

    const settings = await prisma.adminSettings.findUnique({
      where: { id: 'global_settings' },
    });

    res.status(200).json({
      metrics: {
        totalUsers,
        verifiedUsers,
        totalTransactions,
        totalGoals,
        activeSessions,
      },
      auditLogs: logs,
      settings,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve admin system intelligence metrics' });
  }
};

export const getUsersAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isVerified: true,
        creditScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load system users list' });
  }
};

export const updateUserRoleAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'USER' && role !== 'ADMIN') {
      res.status(400).json({ error: 'Invalid user role value' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    });

    res.status(200).json({ message: `Role updated successfully for user ${updated.email}`, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user role settings' });
  }
};

export const updateGlobalSettingsAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { maintenanceMode, signupAllowed, freeTierLimit } = req.body;

    const updated = await prisma.adminSettings.update({
      where: { id: 'global_settings' },
      data: {
        maintenanceMode,
        signupAllowed,
        freeTierLimit: parseFloat(freeTierLimit),
      },
    });

    res.status(200).json({ message: 'Global platform settings updated successfully', settings: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to adjust global administrative settings' });
  }
};
