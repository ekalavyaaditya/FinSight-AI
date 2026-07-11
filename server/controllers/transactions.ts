import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { StatementParser } from '../services/parser';
import { Category } from '@prisma/client';

export const uploadStatement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No statement file uploaded' });
      return;
    }

    const { buffer, originalname } = req.file;
    const isCSV = originalname.endsWith('.csv');
    const isPDF = originalname.endsWith('.pdf');

    if (!isCSV && !isPDF) {
      res.status(400).json({ error: 'Unsupported file format. Please upload CSV or PDF' });
      return;
    }

    // Parse transactions based on format
    const parsedTransactions = isCSV
      ? await StatementParser.parseCSV(buffer)
      : await StatementParser.parsePDF(buffer);

    if (parsedTransactions.length === 0) {
      res.status(422).json({ error: 'No valid transactions found in the uploaded statement. Please check file format.' });
      return;
    }

    // Process and insert transactions with duplication safety checks
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const tx of parsedTransactions) {
      // Find matches for date, description, and amount to prevent duplicates
      const startOfDay = new Date(tx.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(tx.date);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await prisma.transaction.findFirst({
        where: {
          userId,
          amount: tx.amount,
          description: tx.description,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (!existing) {
        await prisma.transaction.create({
          data: {
            userId,
            date: tx.date,
            description: tx.description,
            merchant: tx.merchant || tx.description.split(' ')[0],
            amount: tx.amount,
            category: tx.category as Category,
            importFile: originalname,
          },
        });
        insertedCount++;
      } else {
        duplicateCount++;
      }
    }

    res.status(201).json({
      message: 'Statement processed successfully!',
      totalParsed: parsedTransactions.length,
      insertedCount,
      duplicateCount,
      fileName: originalname,
    });
  } catch (error: any) {
    console.error('Upload processing error:', error);
    res.status(500).json({ error: 'Failed to process and import your statement' });
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

    res.status(200).json({
      transactions,
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
    const { date, description, amount, category, merchant, notes, tags, isFavorite } = req.body;

    const tx = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        description,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        category: category as Category,
        merchant,
        notes,
        tags,
        isFavorite,
      },
    });

    res.status(200).json({ message: 'Transaction updated successfully', transaction: updated });
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
