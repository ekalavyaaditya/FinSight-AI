import { Router } from 'express';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getLoans,
  createLoan,
  deleteLoan,
  calculateEMI,
  getInvestmentRecommendations,
  getCreditScoreImprovement,
  getAIPredictions,
  getAIInsights,
  queryAIChat,
  getNotifications,
  markNotificationRead,
} from '../controllers/intelligence';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Shield all endpoints with JWT Authentication
router.use(authenticateJWT as any);

// Savings Goal endpoints
router.get('/savings', getSavingsGoals as any);
router.post('/savings', createSavingsGoal as any);
router.put('/savings/:id', updateSavingsGoal as any);
router.delete('/savings/:id', deleteSavingsGoal as any);

// EMI Planner / Loan endpoints
router.get('/loans', getLoans as any);
router.post('/loans', createLoan as any);
router.delete('/loans/:id', deleteLoan as any);
router.get('/loans/calculate-emi', calculateEMI as any);

// Advisory recommendations
router.get('/investment-recommendations', getInvestmentRecommendations as any);
router.get('/credit-roadmap', getCreditScoreImprovement as any);

// AI ML Predictors & Chat APIs
router.get('/predictions', getAIPredictions as any);
router.get('/ai-insights', getAIInsights as any);
router.post('/chat', queryAIChat as any);

// Smart Notifications
router.get('/notifications', getNotifications as any);
router.put('/notifications/:id/read', markNotificationRead as any);

export default router;
