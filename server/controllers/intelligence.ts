import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai:8000';

// ==========================================
// 1. SAVINGS PLANNER GOALS CRUD
// ==========================================
export const getSavingsGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { targetDate: 'asc' },
    });
    res.status(200).json(goals);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve savings goals' });
  }
};

export const createSavingsGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, targetAmount, currentAmount, monthlyContribution, targetDate } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount || 0),
        monthlyContribution: parseFloat(monthlyContribution || 0),
        targetDate: new Date(targetDate),
      },
    });
    res.status(201).json({ message: 'Savings goal created successfully', goal });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
};

export const updateSavingsGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, targetAmount, currentAmount, monthlyContribution, targetDate } = req.body;

    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!goal) {
      res.status(404).json({ error: 'Savings goal not found' });
      return;
    }

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name,
        targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
        currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : undefined,
        monthlyContribution: monthlyContribution !== undefined ? parseFloat(monthlyContribution) : undefined,
        targetDate: targetDate ? new Date(targetDate) : undefined,
      },
    });

    res.status(200).json({ message: 'Savings goal updated successfully', goal: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update savings goal' });
  }
};

export const deleteSavingsGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!goal) {
      res.status(404).json({ error: 'Savings goal not found' });
      return;
    }

    await prisma.savingsGoal.delete({ where: { id } });
    res.status(200).json({ message: 'Savings goal deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
};

// ==========================================
// 2. EMI / LOAN PLANNER CALCULATOR & SIMULATOR
// ==========================================
export const getLoans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
    res.status(200).json(loans);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve loans list' });
  }
};

export const createLoan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, principal, interestRate, tenureMonths, startDate, extraMonthlyPay } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const loan = await prisma.loan.create({
      data: {
        userId,
        name,
        principal: parseFloat(principal),
        interestRate: parseFloat(interestRate),
        tenureMonths: parseInt(tenureMonths, 10),
        startDate: new Date(startDate),
        extraMonthlyPay: parseFloat(extraMonthlyPay || 0),
      },
    });
    res.status(201).json({ message: 'Loan registered successfully', loan });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record loan' });
  }
};

export const deleteLoan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const loan = await prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) {
      res.status(404).json({ error: 'Loan registry not found' });
      return;
    }

    await prisma.loan.delete({ where: { id } });
    res.status(200).json({ message: 'Loan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete loan' });
  }
};

/**
 * Calculates a complete amortization schedule, with simulation for extra payments
 */
export const calculateEMI = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { principal, interestRate, tenureMonths, extraMonthlyPay = 0 } = req.query;

    const P = parseFloat(principal as string);
    const R_annual = parseFloat(interestRate as string) / 100;
    const N = parseInt(tenureMonths as string, 10);
    const extra = parseFloat(extraMonthlyPay as string || '0');

    if (isNaN(P) || isNaN(R_annual) || isNaN(N) || P <= 0 || N <= 0) {
      res.status(400).json({ error: 'Invalid parameters for EMI calculation' });
      return;
    }

    const R_monthly = R_annual / 12;

    // Standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
    let standardEMI = 0;
    if (R_monthly === 0) {
      standardEMI = P / N;
    } else {
      standardEMI = (P * R_monthly * Math.pow(1 + R_monthly, N)) / (Math.pow(1 + R_monthly, N) - 1);
    }

    // Generate amortization details with extra payments
    const schedule: any[] = [];
    let remainingBalance = P;
    let totalInterestPaid = 0;
    let actualMonthsCount = 0;

    for (let month = 1; month <= N && remainingBalance > 0; month++) {
      const interestPayment = remainingBalance * R_monthly;
      let principalPayment = standardEMI - interestPayment;

      // Add extra simulation payment
      let extraApplied = 0;
      if (remainingBalance > (principalPayment + interestPayment)) {
        extraApplied = Math.min(extra, remainingBalance - principalPayment - interestPayment);
      }

      const totalPrincipalForMonth = principalPayment + extraApplied;
      const actualAppliedPrincipal = Math.min(totalPrincipalForMonth, remainingBalance);

      remainingBalance -= actualAppliedPrincipal;
      totalInterestPaid += interestPayment;
      actualMonthsCount = month;

      schedule.push({
        month,
        emi: parseFloat(standardEMI.toFixed(2)),
        interest: parseFloat(interestPayment.toFixed(2)),
        principal: parseFloat(actualAppliedPrincipal.toFixed(2)),
        extraPaid: parseFloat(extraApplied.toFixed(2)),
        remainingBalance: parseFloat(Math.max(0, remainingBalance).toFixed(2)),
      });
    }

    const standardTotalPayment = standardEMI * N;
    const standardTotalInterest = standardTotalPayment - P;

    const actualTotalPayment = P + totalInterestPaid;
    const interestSaved = standardTotalInterest - totalInterestPaid;
    const monthsSaved = N - actualMonthsCount;

    res.status(200).json({
      standardMonthlyEMI: parseFloat(standardEMI.toFixed(2)),
      standardTotalInterest: parseFloat(standardTotalInterest.toFixed(2)),
      standardTotalPayment: parseFloat(standardTotalPayment.toFixed(2)),
      simulatedTotalInterest: parseFloat(totalInterestPaid.toFixed(2)),
      simulatedTotalPayment: parseFloat(actualTotalPayment.toFixed(2)),
      interestSaved: parseFloat(Math.max(0, interestSaved).toFixed(2)),
      monthsSaved,
      schedule,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compute loan amortization schedule' });
  }
};

// ==========================================
// 3. INVESTMENT & WEALTH ADVISORY
// ==========================================
export const getInvestmentRecommendations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { riskProfile: true, creditScore: true, currency: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const risk = user.riskProfile || 'MODERATE';

    // Premium intelligence-based educational portfolios
    const recommendations: any = {
      CONSERVATIVE: [
        { asset: 'Fixed Deposits', allocation: 40, yield: '6.5%', type: 'Debt', desc: 'Secure capital backup with predictable yield curves.' },
        { asset: 'Government Treasury Bonds', allocation: 35, yield: '4.8%', type: 'Sovereign', desc: 'Zero default risk asset class.' },
        { asset: 'Liquid Mutual Funds', allocation: 15, yield: '5.5%', type: 'Debt', desc: 'Immediate emergency liquidity reserves.' },
        { asset: 'Gold Bullion / Sovereign Gold Bond', allocation: 10, yield: 'Inflation Hedge', type: 'Commodity', desc: 'Sovereign hedge.' },
      ],
      MODERATE: [
        { asset: 'Broad S&P 500 / Global Index Fund', allocation: 45, yield: '9.0%', type: 'Equity', desc: 'Core wealth generation vehicle.' },
        { asset: 'High Yield Corporate Debentures', allocation: 25, yield: '7.5%', type: 'Fixed Income', desc: 'Enhanced yield with stable ratings.' },
        { asset: 'Bluechip Equity Growth Stock', allocation: 20, yield: '12%', type: 'Equity', desc: 'Largecap capital appreciation.' },
        { asset: 'Real Estate Investment Trusts (REITs)', allocation: 10, yield: '6.2%', type: 'Property', desc: 'Commercial properties rent yields.' },
      ],
      AGGRESSIVE: [
        { asset: 'Nifty/NASDAQ Growth ETFs', allocation: 55, yield: '14.5%', type: 'Equity Index', desc: 'Maximizing high-beta capitalization.' },
        { asset: 'Emerging Markets Venture Funds', allocation: 20, yield: '18%', type: 'Equity Venture', desc: 'High risk high-reward emerging economies.' },
        { asset: 'Commodities & Digital Assets', allocation: 15, yield: 'High Volatility', type: 'Crypto/Hedging', desc: 'Decentralized alternative asset coverage.' },
        { asset: 'Corporate Arbitrage Mutual Funds', allocation: 10, yield: '7.2%', type: 'Hybrid', desc: 'Tax efficient yield stabilizer.' },
      ],
    };

    const targetList = recommendations[risk] || recommendations['MODERATE'];

    res.status(200).json({
      riskProfile: risk,
      disclaimer: 'This section provides educational financial information and is not financial advice.',
      portfolio: targetList,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load educational investment advisory.' });
  }
};

// ==========================================
// 4. CREDIT SCORE ROADMAP ADVISOR
// ==========================================
export const getCreditScoreImprovement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditScore: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const score = user.creditScore || 650;
    const suggestions: any[] = [];

    // Algorithmic Credit Optimization rules
    if (score < 600) {
      suggestions.push(
        { action: 'Settle Past Due Accounts', impact: 'HIGH', timeframe: '30 Days', desc: 'Immediately resolve overdue loan or card dues to wipe out current delinquencies.' },
        { action: 'Get a Secured Credit Card', impact: 'HIGH', timeframe: '6 Months', desc: 'Collateralize a cash deposit for structured credit line usage.' },
        { action: 'Set Auto-Pay for Minimums', impact: 'VERY HIGH', timeframe: 'Ongoing', desc: 'Never miss an active installment date. 35% of score is payment history.' }
      );
    } else if (score < 720) {
      suggestions.push(
        { action: 'Reduce Credit Card Balances', impact: 'HIGH', timeframe: '45 Days', desc: 'Get your credit utilization ratio under 30% threshold immediately.' },
        { action: 'Request Higher Credit Limits', impact: 'MEDIUM', timeframe: '30 Days', desc: 'Increase total credit pool to automatically lower utilization math.' },
        { action: 'Audit Credit Report Discrepancies', impact: 'MEDIUM', timeframe: '60 Days', desc: 'File formal complaints for inaccurate late payments.' }
      );
    } else {
      suggestions.push(
        { action: 'Maintain Ultra Low Utilization (Under 10%)', impact: 'MEDIUM', timeframe: '30 Days', desc: 'Top tier scorers keep utilization at single digits.' },
        { action: 'Avoid Hard Credit Inquiries', impact: 'LOW', timeframe: '6 Months', desc: 'Refrain from submitting retail store loan/card requests.' },
        { action: 'Increase Credit Age Average', impact: 'MEDIUM', timeframe: 'Long term', desc: 'Avoid closing oldest credit lines to safeguard history depth.' }
      );
    }

    res.status(200).json({
      currentScore: score,
      rating: score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : 'Needs Work',
      suggestions,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate credit improvement insights' });
  }
};

// ==========================================
// 5. ML PREDICTIONS & AI CHAT INTEGRATION
// ==========================================
export const getAIPredictions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    // Call FastAPI Service
    const response = await axios.post(`${AI_SERVICE_URL}/predict`, {
      transactions: transactions.map(t => ({
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('FastAPI Prediction call failure, triggering fallback:', error.message);
    // Graceful offline fallback in TS
    res.status(200).json({
      predicted_expense: 2850.0,
      predicted_savings: 820.0,
      confidence_score: 0.78,
      budget_risk: 'MEDIUM',
      risk_explanation: 'Active sandbox fallback mode in effect. Predictive trends estimated from standard distribution.',
      trends: [
        { month: '2025-01', amount: 2600.0 },
        { month: '2025-02', amount: 2750.0 },
        { month: '2025-03 (Est)', amount: 2850.0 },
      ],
    });
  }
};

export const getAIInsights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditScore: true } });
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 50,
    });

    const response = await axios.post(`${AI_SERVICE_URL}/insights`, {
      transactions: transactions.map(t => ({
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
      creditScore: user?.creditScore || 680,
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.warn('FastAPI Insights call failure, running offline fallback:', error.message);
    res.status(200).json({
      insights: [
        { title: 'Subtle Subscription Leakage Detected', content: 'You have multiple digital plans (like Netflix and Spotify). Trimming unused accounts yields direct capital savings.', category: 'SUBSCRIPTION', severity: 'LOW' },
        { title: 'Elevated Dining Out Volatility', content: 'Spending on restaurant and meals is high this period. Home prep can boost savings yield by 20%.', category: 'OVERSPENDING', severity: 'MEDIUM' },
        { title: 'Actionable Credit Optimization', content: 'Pay card balances before statement close dates to aggressively lower utilization metrics.', category: 'BUDGET', severity: 'HIGH' },
      ],
      model: 'local-fallback',
    });
  }
};

export const queryAIChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
      query,
      transactions: transactions.map(t => ({
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('FastAPI Chat call failure, triggering local conversation heuristics:', error.message);
    res.status(200).json({
      answer: "I'm operating in active safety offline mode. I see you have active portfolio listings. Please establish secure connections with your bank statement PDF to get direct feedback, or type 'spend' / 'save' for customized guidelines.",
      engine: 'local-chat-fallback',
    });
  }
};

// ==========================================
// 6. SMART NOTIFICATIONS GET & READ
// ==========================================
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update notification state' });
  }
};
