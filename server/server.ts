import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import intelligenceRoutes from './routes/intelligence';
import adminRoutes from './routes/admin';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security and utility middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // allows serving images/files across domains if needed
}));
app.use(cors({
  origin: '*', // in production, configure to the actual frontend client domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Main request logging & health checks
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Register platform routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/admin', adminRoutes);

import { prisma } from './config/db';

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled System Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred',
  });
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    let dbStatus = 'Checking...';
    try {
      await prisma.$connect();
      dbStatus = 'Connected';
    } catch (error: any) {
      dbStatus = 'Disconnected (Error)';
      console.error('Prisma connection error:', error.message || error);
    }

    console.log(`=========================================`);
    console.log(`🚀 FinSight AI Server started successfully`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${dbStatus}`);
    console.log(`=========================================`);
  });
}

export default app;
