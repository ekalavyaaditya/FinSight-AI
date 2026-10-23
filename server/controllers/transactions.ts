import { createHash } from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { StatementParser, NormalizedTransaction, StatementParseOutput } from '../services/parser';
import { MerchantCatalog } from '../services/merchantCatalog';
import { Category } from '@prisma/client';

function mapToPrismaCategory(cat: string): Category {
  switch (cat) {
    case 'Food & Dining':
      return Category.FOOD;
    case 'Shopping':
      return Category.SHOPPING;
    case 'Transport':
      return Category.TRAVEL;
    case 'Bills':
      return Category.BILLS;
    case 'Healthcare':
      return Category.HEALTHCARE;
    case 'Salary':
      return Category.SALARY;
    case 'Loan Payments':
      return Category.EMI;
    case 'Investments':
      return Category.INVESTMENT;
    case 'Refunds':
      return Category.OTHERS;
    case 'Bank Charges':
      return Category.OTHERS;
    case 'Personal Transfers':
      return Category.OTHERS;
    case 'Cash Withdrawals':
      return Category.OTHERS;
    default:
      return Category.OTHERS;
  }
}

export const uploadStatement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const files: Express.Multer.File[] = [];
    if (req.files && Array.isArray(req.files)) {
      files.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      for (const key of Object.keys(req.files)) {
        const arr = (req.files as any)[key];
        if (Array.isArray(arr)) files.push(...arr);
      }
    } else if (req.file) {
      files.push(req.file);
    }

    if (files.length === 0) {
      res.status(400).json({ error: 'No statement file uploaded' });
      return;
    }

    const seenFileHashes = new Map<string, string>();
    const fileHashes = new Map<Express.Multer.File, string>();
    const duplicateFiles: string[] = [];
    for (const file of files) {
      const fileHash = createHash('sha256').update(file.buffer).digest('hex');
      if (seenFileHashes.has(fileHash)) {
        duplicateFiles.push(file.originalname);
      } else {
        seenFileHashes.set(fileHash, file.originalname);
      }
      fileHashes.set(file, fileHash);
    }

    if (duplicateFiles.length > 0) {
      res.status(400).json({
        error: `Duplicate statement file${duplicateFiles.length === 1 ? '' : 's'} detected in this batch: ${duplicateFiles.join(', ')}. Each file can only be uploaded once.`,
        duplicateFiles,
      });
      return;
    }

    const fileHashTags = [...fileHashes.values()].map(hash => `statement-sha256:${hash}`);
    const previouslyImported = await prisma.transaction.findMany({
      where: { userId, tags: { hasSome: fileHashTags } },
      select: { tags: true },
    });
    const previouslyImportedTags = new Set(previouslyImported.flatMap(transaction => transaction.tags));
    const previouslyImportedFiles = files
      .filter(file => previouslyImportedTags.has(`statement-sha256:${fileHashes.get(file)}`))
      .map(file => file.originalname);

    if (previouslyImportedFiles.length > 0) {
      res.status(409).json({
        error: `This statement file${previouslyImportedFiles.length === 1 ? ' has' : 's have'} already been imported: ${previouslyImportedFiles.join(', ')}.`,
        duplicateFiles: previouslyImportedFiles,
      });
      return;
    }

    let grandTotalParsed = 0;
    let grandInsertedCount = 0;
    let grandDuplicateCount = 0;
    let grandReviewCount = 0;
    let grandFailedCount = 0;

    const filesProcessed: Array<{
      fileName: string;
      format: string;
      status: 'success' | 'failed' | 'partial';
      detectedCurrency: string;
      totalParsed: number;
      insertedCount: number;
      duplicateCount: number;
      reviewCount: number;
      errors: string[];
    }> = [];

    const allNormalizedTransactions: NormalizedTransaction[] = [];
    const allReviewItems: NormalizedTransaction[] = [];

    for (const file of files) {
      const { buffer, originalname } = file;
      const lowerName = originalname.toLowerCase();
      const fileHashTag = `statement-sha256:${fileHashes.get(file)}`;

      let parseOutput: StatementParseOutput;

      try {
        if (lowerName.endsWith('.csv')) {
          parseOutput = await StatementParser.parseCSV(buffer, { filename: originalname, userId });
        } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
          parseOutput = await StatementParser.parseExcel(buffer, { filename: originalname, userId });
        } else if (lowerName.endsWith('.pdf')) {
          parseOutput = await StatementParser.parsePDF(buffer, { filename: originalname, userId });
        } else {
          filesProcessed.push({
            fileName: originalname,
            format: 'UNKNOWN',
            status: 'failed',
            detectedCurrency: 'UNKNOWN',
            totalParsed: 0,
            insertedCount: 0,
            duplicateCount: 0,
            reviewCount: 0,
            errors: ['Unsupported file format. Please upload PDF, CSV, or Excel (.xlsx/.xls)'],
          });
          grandFailedCount++;
          continue;
        }
      } catch (parseErr: any) {
        filesProcessed.push({
          fileName: originalname,
          format: 'UNKNOWN',
          status: 'failed',
          detectedCurrency: 'UNKNOWN',
          totalParsed: 0,
          insertedCount: 0,
          duplicateCount: 0,
          reviewCount: 0,
          errors: [parseErr.message || 'File parsing exception'],
        });
        grandFailedCount++;
        continue;
      }

      let fileInserted = 0;
      let fileDuplicates = 0;
      let fileReviews = 0;

      // Pre-fetch all user transactions in the file's date range for high-speed in-memory deduplication
      const validDates = parseOutput.transactions
        .map(t => new Date(t.transactionDate).getTime())
        .filter(t => !isNaN(t));

      let existingKeySet = new Set<string>();
      const existingTransactionsByKey = new Map<string, { id: string; tags: string[] }>();
      if (validDates.length > 0) {
        const minDate = new Date(Math.min(...validDates) - 86400000);
        const maxDate = new Date(Math.max(...validDates) + 86400000);
        const existingList = await prisma.transaction.findMany({
          where: {
            userId,
            date: { gte: minDate, lte: maxDate },
          },
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            tags: true,
            notes: true,
          },
        });
        const existingDedupKeys = existingList.map(e => {
          let amount = e.amount;
          if (e.notes) {
            try {
              const metadata = JSON.parse(e.notes);
              if (metadata.transactionType === 'debit') amount = -Math.abs(amount);
              if (metadata.transactionType === 'credit') amount = Math.abs(amount);
            } catch {
              // Keep the stored sign for older plain-text notes.
            }
          }
          return `${amount}_${e.description.trim()}_${new Date(e.date).toISOString().slice(0, 10)}`;
        });
        existingKeySet = new Set(existingDedupKeys);
        existingList.forEach((e, index) => {
          existingTransactionsByKey.set(
            existingDedupKeys[index],
            { id: e.id, tags: e.tags },
          );
        });
      }

      const toCreate: Array<{
        userId: string;
        date: Date;
        description: string;
        merchant: string;
        amount: number;
        category: any;
        notes: string;
        tags: string[];
        importFile: string;
      }> = [];
      let fileHashRecorded = false;

      for (const tx of parseOutput.transactions) {
        allNormalizedTransactions.push(tx);
        if (tx.needsReview) {
          allReviewItems.push(tx);
          fileReviews++;
        }

        const txDate = new Date(tx.transactionDate);
        const dateKey = !isNaN(txDate.getTime()) ? txDate.toISOString().slice(0, 10) : tx.transactionDate;
        const signedAmount = tx.transactionType === 'debit' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        const dedupKey = `${signedAmount}_${tx.description.trim()}_${dateKey}`;

        if (!existingKeySet.has(dedupKey)) {
          existingKeySet.add(dedupKey); // Also prevents intra-file duplicates
          const metaPayload = {
            entityName: tx.entityName,
            entityType: tx.entityType,
            transactionType: tx.transactionType,
            paymentMethod: tx.paymentMethod,
            category: tx.category,
            subcategory: tx.subcategory,
            currency: tx.currency,
            balance: tx.balance,
            valueDate: tx.valueDate,
            confidence: tx.confidence,
            evidence: tx.evidence,
            needsReview: tx.needsReview,
            sourceRow: tx.sourceRow,
            sourcePage: tx.sourcePage,
          };

          const tags = [
            `currency:${tx.currency}`,
            `type:${tx.transactionType}`,
            `rail:${tx.paymentMethod}`,
            `entity:${tx.entityType}`,
          ];
          if (!fileHashRecorded) {
            tags.push(fileHashTag);
            fileHashRecorded = true;
          }
          if (tx.needsReview) tags.push('status:needsReview');

          toCreate.push({
            userId,
            date: !isNaN(txDate.getTime()) ? txDate : new Date(),
            description: tx.description,
            merchant: tx.entityName || tx.description.split(' ')[0],
            amount: signedAmount,
            category: mapToPrismaCategory(tx.category),
            notes: JSON.stringify(metaPayload),
            tags,
            importFile: originalname,
          });
          fileInserted++;
        } else {
          fileDuplicates++;
          const existingTransaction = existingTransactionsByKey.get(dedupKey);
          if (!fileHashRecorded && existingTransaction && !existingTransaction.tags.includes(fileHashTag)) {
            await prisma.transaction.update({
              where: { id: existingTransaction.id },
              data: { tags: { push: fileHashTag } },
            });
            existingTransaction.tags.push(fileHashTag);
            fileHashRecorded = true;
          }
        }
      }

      // Fast chunked insertion via createMany
      if (toCreate.length > 0) {
        const BATCH_SIZE = 500;
        for (let c = 0; c < toCreate.length; c += BATCH_SIZE) {
          await prisma.transaction.createMany({
            data: toCreate.slice(c, c + BATCH_SIZE),
          });
        }
      }

      grandTotalParsed += parseOutput.transactions.length;
      grandInsertedCount += fileInserted;
      grandDuplicateCount += fileDuplicates;
      grandReviewCount += fileReviews;

      filesProcessed.push({
        fileName: originalname,
        format: parseOutput.format,
        status: parseOutput.transactions.length > 0 ? (fileDuplicates > 0 && fileInserted === 0 ? 'partial' : 'success') : 'failed',
        detectedCurrency: parseOutput.detectedCurrency,
        totalParsed: parseOutput.transactions.length,
        insertedCount: fileInserted,
        duplicateCount: fileDuplicates,
        reviewCount: fileReviews,
        errors: parseOutput.errors,
      });
    }

    if (grandTotalParsed === 0) {
      res.status(422).json({
        error: 'No valid transactions found in the uploaded statement batch.',
        filesProcessed,
      });
      return;
    }

    res.status(201).json({
      message: 'Batch statements processed successfully!',
      totalParsed: grandTotalParsed,
      insertedCount: grandInsertedCount,
      duplicateCount: grandDuplicateCount,
      reviewCount: grandReviewCount,
      failedCount: grandFailedCount,
      fileName: files.length === 1 ? files[0].originalname : `${files.length} files`,
      filesProcessed,
      transactions: allNormalizedTransactions,
      reviewItems: allReviewItems,
    });
  } catch (error: any) {
    console.error('Upload processing error:', error);
    res.status(500).json({ error: 'Failed to process and import your statement batch' });
  }
};

export const getTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      search,
      category,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
      page = '1',
      limit = '15',
      isFavorite,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma query clauses
    const whereClause: any = { userId };

    if (search) {
      whereClause.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { merchant: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
      ];
    }

    if (category) {
      whereClause.category = category as Category;
    }

    if (isFavorite) {
      whereClause.isFavorite = isFavorite === 'true';
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate as string);
      }
    }

    // Perform queries
    const total = await prisma.transaction.count({ where: whereClause });
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: limitNum,
    });

    // Unpack rich metadata from notes if present
    const enrichedTransactions = transactions.map(t => {
      let meta: any = {};
      if (t.notes) {
        try {
          meta = JSON.parse(t.notes);
        } catch {
          // Plain text notes
        }
      }
      return {
        ...t,
        entityName: meta.entityName || t.merchant,
        entityType: meta.entityType || 'unknown',
        transactionType: meta.transactionType || 'debit',
        paymentMethod: meta.paymentMethod || 'UNKNOWN',
        subcategory: meta.subcategory,
        currency: meta.currency || 'USD',
        balance: meta.balance,
        needsReview: meta.needsReview || false,
        confidence: meta.confidence,
        evidence: meta.evidence || [],
      };
    });

    res.status(200).json({
      transactions: enrichedTransactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
};

export const getTransactionsSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [user, transactions, savingsGoals, loans] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { creditScore: true, currency: true, riskProfile: true },
      }),
      prisma.transaction.findMany({
        where: { userId },
        select: { date: true, amount: true, category: true, notes: true, description: true },
        orderBy: { date: 'asc' },
      }),
      prisma.savingsGoal.findMany({
        where: { userId },
        select: { currentAmount: true },
      }),
      prisma.loan.findMany({
        where: { userId },
        select: { principal: true },
      }),
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    let inflowCount = 0;
    let outflowCount = 0;
    let latestStatementBalance: number | null = null;

    const categoryMap: { [cat: string]: number } = {};
    const dailyMap: { [dateStr: string]: number } = {};
    const dailyIncomeMap: { [dateStr: string]: number } = {};
    const monthlyMap: { [month: string]: number } = {};

    transactions.forEach((tx) => {
      let txMetadata: any = {};
      if (tx.notes) {
        try {
          txMetadata = JSON.parse(tx.notes);
        } catch {
          // Existing transactions may use notes as plain text.
        }
      }

      // Older statement imports stored absolute amounts. Use the parser's
      // transaction type metadata to keep those debits in outbound totals.
      const isOutflow = tx.amount < 0 || (tx.amount > 0 && txMetadata.transactionType === 'debit');
      const amt = isOutflow ? -Math.abs(tx.amount) : Math.abs(tx.amount);
      const d = new Date(tx.date);
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      const monthStr = dateStr ? dateStr.slice(0, 7) : '';

      if (amt > 0) {
        totalIncome += amt;
        inflowCount++;
        if (dateStr) {
          dailyIncomeMap[dateStr] = (dailyIncomeMap[dateStr] || 0) + amt;
        }
      } else {
        const absAmt = Math.abs(amt);
        totalExpenses += absAmt;
        outflowCount++;

        // Category breakdown
        const category = txMetadata.category || tx.category;
        categoryMap[category] = (categoryMap[category] || 0) + absAmt;

        // Daily spend
        if (dateStr) {
          dailyMap[dateStr] = (dailyMap[dateStr] || 0) + absAmt;
        }

        // Monthly spend
        if (monthStr) {
          monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + absAmt;
        }
      }

      // Check for statement balance in notes if provided by parser
      if (txMetadata.balance !== undefined && !isNaN(Number(txMetadata.balance))) {
        latestStatementBalance = Number(txMetadata.balance);
      }
    });

    // Compute Net balance
    const netCashFlow = totalIncome - totalExpenses;
    const balance = latestStatementBalance !== null ? latestStatementBalance : netCashFlow;

    // Savings & Net worth
    const totalSavingsGoals = savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalLoans = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
    const netWorth = balance + totalSavingsGoals - totalLoans;

    // Category composition formatted
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);

    // Heatmap grid (last 28 days anchored to the latest transaction date)
    // Use the most recent transaction date instead of today so that
    // historical bank statements still populate the grid
    const dailyDates = Object.keys(dailyMap).sort();
    const allTxDates = transactions.map(tx => {
      const d = new Date(tx.date);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    }).filter(Boolean).sort();
    const latestTxDate = allTxDates.length > 0 ? allTxDates[allTxDates.length - 1] : null;
    const anchorDate = latestTxDate ? new Date(latestTxDate + 'T12:00:00Z') : new Date();

    const dailySpending: Array<{ day: number; date: string; amount: number; income: number }> = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      dailySpending.push({
        day: d.getDate(),
        date: dStr,
        amount: parseFloat((dailyMap[dStr] || 0).toFixed(2)),
        income: parseFloat((dailyIncomeMap[dStr] || 0).toFixed(2)),
      });
    }

    // Monthly trends
    const monthlyTrends = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        amount: parseFloat(amount.toFixed(2)),
      }));

    // Financial Health Score calculation
    let healthScore = 0;
    let healthGrade = 'N/A';
    let healthStatus = 'Awaiting statement data';

    if (transactions.length > 0) {
      const creditScore = user?.creditScore || 650;
      let score = 0;

      // 1. Savings ratio up to 35 pts
      const savingsRatio = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
      if (savingsRatio >= 0.3) score += 35;
      else if (savingsRatio >= 0.15) score += 25;
      else if (savingsRatio > 0) score += 15;
      else score += 5;

      // 2. Expense coverage up to 35 pts
      if (totalIncome > 0) {
        const expenseRatio = totalExpenses / totalIncome;
        if (expenseRatio <= 0.5) score += 35;
        else if (expenseRatio <= 0.75) score += 25;
        else if (expenseRatio <= 1.0) score += 15;
        else score += 5;
      } else {
        score += 10;
      }

      // 3. Credit score contribution up to 30 pts
      const creditRatio = Math.min(1, Math.max(0, (creditScore - 300) / (850 - 300)));
      score += Math.round(creditRatio * 30);

      healthScore = Math.min(100, Math.max(0, score));

      if (healthScore >= 85) {
        healthGrade = 'Grade A+';
        healthStatus = 'Outstanding financial resilience';
      } else if (healthScore >= 75) {
        healthGrade = 'Grade A';
        healthStatus = 'Healthy budget & low debt';
      } else if (healthScore >= 60) {
        healthGrade = 'Grade B';
        healthStatus = 'Stable with moderate expenses';
      } else if (healthScore >= 45) {
        healthGrade = 'Grade C';
        healthStatus = 'Expenses approaching inflow';
      } else {
        healthGrade = 'Grade D';
        healthStatus = 'High outflow relative to deposits';
      }
    }

    // Expense risk assessment
    let expenseRisk = 'Normal';
    if (totalExpenses > totalIncome && totalIncome > 0) {
      expenseRisk = 'Deficit outflow';
    } else if (totalExpenses > totalIncome * 0.8 && totalIncome > 0) {
      expenseRisk = 'Elevated spend';
    } else if (totalExpenses > 0) {
      expenseRisk = 'Within safe limits';
    } else {
      expenseRisk = 'No debits';
    }

    res.status(200).json({
      balance: parseFloat(balance.toFixed(2)),
      income: parseFloat(totalIncome.toFixed(2)),
      expenses: parseFloat(totalExpenses.toFixed(2)),
      netWorth: parseFloat(netWorth.toFixed(2)),
      savings: parseFloat(Math.max(0, totalIncome - totalExpenses).toFixed(2)),
      healthScore,
      healthGrade,
      healthStatus,
      inflowCount,
      outflowCount,
      totalCount: transactions.length,
      expenseRisk,
      categoryBreakdown,
      dailySpending,
      monthlyTrends,
      currency: user?.currency || 'USD',
    });
  } catch (error: any) {
    console.error('Failed to compute transactions summary:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions summary' });
  }
};

export const createTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { date, description, amount, category, merchant, notes, tags } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        date: new Date(date),
        description,
        amount: parseFloat(amount),
        category: (category as Category) || Category.OTHERS,
        merchant: merchant || description.split(' ')[0],
        notes,
        tags: tags || [],
      },
    });

    res.status(201).json({ message: 'Transaction created successfully', transaction });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

export const updateTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { date, description, amount, category, merchant, subcategory, entityType, notes, tags, isFavorite } = req.body;

    const tx = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    // If user corrected category or merchant identity, remember the mapping for future statements
    if (userId && (merchant || category)) {
      const confirmedName = merchant || tx.merchant || tx.description.split(' ')[0];
      const confirmedCat = category || String(tx.category);
      const confirmedSubcat = subcategory || 'User Confirmed';
      const confirmedType = entityType || 'merchant';

      MerchantCatalog.saveConfirmedRule(
        userId,
        tx.description,
        confirmedName,
        confirmedType,
        confirmedCat,
        confirmedSubcat
      );
    }

    let updatedNotes = notes !== undefined ? notes : tx.notes;
    if (subcategory || entityType) {
      try {
        const existingMeta = tx.notes ? JSON.parse(tx.notes) : {};
        const mergedMeta = {
          ...existingMeta,
          entityName: merchant || existingMeta.entityName,
          entityType: entityType || existingMeta.entityType,
          category: category || existingMeta.category,
          subcategory: subcategory || existingMeta.subcategory,
          needsReview: false,
        };
        updatedNotes = JSON.stringify(mergedMeta);
      } catch {
        // preserve
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        description,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        category: category ? (category as Category) : undefined,
        merchant,
        notes: updatedNotes,
        tags,
        isFavorite,
      },
    });

    res.status(200).json({ message: 'Transaction updated successfully and merchant mapping saved', transaction: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

export const deleteTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const tx = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    await prisma.transaction.delete({ where: { id } });
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

// Bulk Operations
export const bulkUpdateTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { ids, category, tags } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Invalid or empty transaction ids list' });
      return;
    }

    const data: any = {};
    if (category) data.category = category as Category;
    if (tags) data.tags = tags;

    const updated = await prisma.transaction.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data,
    });

    res.status(200).json({ message: `Successfully updated ${updated.count} transactions` });
  } catch (error: any) {
    res.status(500).json({ error: 'Bulk transaction update failed' });
  }
};

export const bulkDeleteTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Invalid or empty transaction ids list' });
      return;
    }

    const deleted = await prisma.transaction.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    res.status(200).json({ message: `Successfully deleted ${deleted.count} transactions` });
  } catch (error: any) {
    res.status(500).json({ error: 'Bulk transaction deletion failed' });
  }
};

// Export transactions as CSV
export const exportTransactionsCSV = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    let csvContent = 'Date,Description,Merchant,Amount,Category,Notes,Tags\n';
    for (const t of transactions) {
      const formattedDate = t.date.toISOString().split('T')[0];
      const desc = `"${t.description.replace(/"/g, '""')}"`;
      const merch = t.merchant ? `"${t.merchant.replace(/"/g, '""')}"` : '';
      const notes = t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '';
      const tags = `"${t.tags.join('; ')}"`;
      csvContent += `${formattedDate},${desc},${merch},${t.amount},${t.category},${notes},${tags}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=finsight_transactions.csv');
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate transaction export' });
  }
};
