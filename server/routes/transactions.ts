import { Router } from 'express';
import multer from 'multer';
import {
  uploadStatement,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkUpdateTransactions,
  bulkDeleteTransactions,
  exportTransactionsCSV,
} from '../controllers/transactions';
import { authenticateJWT } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';

const router = Router();

// Multer memory-storage engine
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB statements
});

// Attach protected middleware
router.use(authenticateJWT as any);

// Routes
router.post('/upload', upload.single('statement'), uploadStatement as any);
router.get('/', apiRateLimiter, getTransactions as any);
router.post('/', createTransaction as any);
router.put('/bulk', bulkUpdateTransactions as any);
router.delete('/bulk', bulkDeleteTransactions as any);
router.get('/export/csv', exportTransactionsCSV as any);

router.put('/:id', updateTransaction as any);
router.delete('/:id', deleteTransaction as any);

export default router;
