import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with primary records...');

  // Upsert global admin settings
  await prisma.adminSettings.upsert({
    where: { id: 'global_settings' },
    update: {},
    create: {
      id: 'global_settings',
      maintenanceMode: false,
      signupAllowed: true,
      freeTierLimit: 1000.0,
    },
  });

  // Create an Admin user
  const adminEmail = 'admin@finsight.ai';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'FinSight Administrator',
        role: 'ADMIN',
        isVerified: true,
        creditScore: 780,
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  }

  // Create a Standard test user
  const userEmail = 'test@finsight.ai';
  const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash('Test@123', 10);
    const testUser = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'Alex Carter',
        role: 'USER',
        isVerified: true,
        creditScore: 710,
        currency: 'USD',
        riskProfile: 'AGGRESSIVE',
      },
    });
    console.log(`Created test user: ${testUser.email}`);

    // Seed some initial transaction history to populate charts
    const categories = [
      { name: 'SALARY', amount: 5500.0, desc: 'TechCorp Monthly Payroll', count: 1, type: 'credit' },
      { name: 'RENT', amount: -1500.0, desc: 'Spacious Midtown Apartment Rent', count: 1, type: 'debit' },
      { name: 'FOOD', amount: -45.5, desc: 'Whole Foods Market Manhattan', count: 4, type: 'debit' },
      { name: 'TRAVEL', amount: -12.5, desc: 'Uber Ride NYC', count: 5, type: 'debit' },
      { name: 'UTILITIES', amount: -120.0, desc: 'Consolidated Edison Power & Gas', count: 1, type: 'debit' },
      { name: 'BILLS', amount: -65.0, desc: 'Verizon Wireless Premium Plan', count: 1, type: 'debit' },
      { name: 'ENTERTAINMENT', amount: -15.49, desc: 'Netflix Subscription Premium', count: 1, type: 'debit' },
      { name: 'ENTERTAINMENT', amount: -14.99, desc: 'Spotify Music Premium Family', count: 1, type: 'debit' },
      { name: 'INVESTMENT', amount: -500.0, desc: 'Vanguard 500 Index Fund ETF', count: 1, type: 'debit' },
      { name: 'SHOPPING', amount: -89.99, desc: 'Amazon Prime Order - Electronics', count: 2, type: 'debit' },
    ];

    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const transactionDate = new Date();
      transactionDate.setDate(today.getDate() - i);

      for (const cat of categories) {
        if (cat.name === 'SALARY' && i !== 0) continue; // Only one salary payment
        if (cat.name === 'RENT' && i !== 1) continue; // Only one rent payment
        if (cat.name === 'UTILITIES' && i !== 5) continue;
        if (cat.name === 'BILLS' && i !== 10) continue;
        if (cat.name === 'INVESTMENT' && i !== 15) continue;

        // Probabilistic random selection for variable spend
        if (['FOOD', 'TRAVEL', 'SHOPPING'].includes(cat.name) && Math.random() > 0.4) {
          const randAmt = cat.amount * (0.8 + Math.random() * 0.4); // Add variance
          await prisma.transaction.create({
            data: {
              userId: testUser.id,
              date: transactionDate,
              description: cat.desc,
              merchant: cat.desc.split(' ')[0],
              amount: parseFloat(randAmt.toFixed(2)),
              category: cat.name as any,
              isPending: false,
              isFavorite: Math.random() > 0.8,
            },
          });
        } else if (!['FOOD', 'TRAVEL', 'SHOPPING', 'SALARY', 'RENT', 'UTILITIES', 'BILLS', 'INVESTMENT'].includes(cat.name)) {
          await prisma.transaction.create({
            data: {
              userId: testUser.id,
              date: transactionDate,
              description: cat.desc,
              merchant: cat.desc.split(' ')[0],
              amount: cat.amount,
              category: cat.name as any,
              isPending: false,
            },
          });
        }
      }
    }

    // Add static ones to ensure exact match
    await prisma.transaction.create({
      data: {
        userId: testUser.id,
        date: today,
        description: 'TechCorp Monthly Payroll',
        merchant: 'TechCorp',
        amount: 5500.00,
        category: 'SALARY',
      },
    });

    await prisma.transaction.create({
      data: {
        userId: testUser.id,
        date: new Date(new Date().setDate(today.getDate() - 1)),
        description: 'Spacious Midtown Apartment Rent',
        merchant: 'Apartment Rent',
        amount: -1500.00,
        category: 'RENT',
      },
    });

    // Add Savings Goals
    await prisma.savingsGoal.createMany({
      data: [
        {
          userId: testUser.id,
          name: 'Tesla Model Y Down Payment',
          targetAmount: 12000.0,
          currentAmount: 4500.0,
          monthlyContribution: 500.0,
          targetDate: new Date(new Date().setMonth(today.getMonth() + 15)),
        },
        {
          userId: testUser.id,
          name: '6-Month Emergency Buffer Fund',
          targetAmount: 20000.0,
          currentAmount: 11200.0,
          monthlyContribution: 800.0,
          targetDate: new Date(new Date().setMonth(today.getMonth() + 11)),
        },
      ],
    });

    // Add Loans
    await prisma.loan.createMany({
      data: [
        {
          userId: testUser.id,
          name: 'Federal Student Debt Refinance',
          principal: 28000.0,
          interestRate: 4.25,
          tenureMonths: 120,
          startDate: new Date('2022-01-15'),
          extraMonthlyPay: 150.0,
        },
      ],
    });

    // Add AI Insights
    await prisma.aiInsight.createMany({
      data: [
        {
          userId: testUser.id,
          title: 'Multiple Streaming Subscriptions Detected',
          content: 'You are currently paying for Netflix, Spotify, and Disney+ simultaneously. Combining or trimming these could save you up to $360 annually.',
          category: 'SUBSCRIPTION',
          severity: 'LOW',
        },
        {
          userId: testUser.id,
          title: 'Unusually High Food & Groceries Spending',
          content: 'Your restaurant and dining-out expenses increased by 34% this month compared to your previous 3-month average. We recommend cooking on weekends to save.',
          category: 'OVERSPENDING',
          severity: 'MEDIUM',
        },
      ],
    });

    // Add Notifications
    await prisma.notification.createMany({
      data: [
        {
          userId: testUser.id,
          title: 'Salary Deposited Successfully',
          message: 'Your monthly salary from TechCorp ($5,500.00) has been successfully posted to your portfolio.',
          type: 'GENERAL',
        },
        {
          userId: testUser.id,
          title: 'Emergency Fund Goal Approaching 60%',
          message: 'Excellent progress! Your 6-Month Emergency Buffer Fund is only $800 away from hitting the 60% mark.',
          type: 'GENERAL',
        },
      ],
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
