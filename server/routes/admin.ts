import { Router } from 'express';
import {
  getAdminStats,
  getUsersAdmin,
  updateUserRoleAdmin,
  updateGlobalSettingsAdmin,
} from '../controllers/admin';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Shield all administration routes with both JWT verification AND role checks
router.use(authenticateJWT as any);
router.use(requireRole('ADMIN') as any);

router.get('/stats', getAdminStats as any);
router.get('/users', getUsersAdmin as any);
router.put('/users/:id/role', updateUserRoleAdmin as any);
router.put('/settings', updateGlobalSettingsAdmin as any);

export default router;
