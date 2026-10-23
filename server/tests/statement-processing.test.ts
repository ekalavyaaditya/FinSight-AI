import { StatementParser } from '../services/parser';
import { CurrencyService } from '../services/currency';
import { MerchantCatalog } from '../services/merchantCatalog';
import * as xlsx from 'xlsx';

describe('FinSight AI Bank Statement Processing Suite', () => {

  // Test Case 1: Exact prompt test case
  describe('Test Case 1: McDonald UPI Debit with Running Balance', () => {
    it('should correctly parse McDonald UPI debit, classify Food & Dining, detect INR and running balance', async () => {
      const statementLine = '11/04/2026 11/04/2026 | WDL TFR | UPI/DR/496603932769/McDonald/YESB/MCDONALDSI/Paym | 0097695162091 AT 10369 BEL FACTORY CAMPUS | -201.97 | -1,91,352.62';
      const statementContent = `Statement of Account (Indian Banking Rail)\nDate | Value Date | Code | Particulars | Details | Amount | Balance\n${statementLine}`;
      const buffer = Buffer.from(statementContent, 'utf-8');

      // Test via CSV/tabular parser
      const result = await StatementParser.parseCSV(buffer, { filename: 'test_mcdonald.csv' });

      expect(result.transactions.length).toBeGreaterThanOrEqual(1);
      const tx = result.transactions[0];

      expect(tx.transactionDate).toBe('2026-04-11');
      expect(tx.amount).toBe(201.97);
      expect(tx.transactionType).toBe('debit');
      expect(tx.paymentMethod).toBe('UPI');
      expect(tx.entityName).toBe("McDonald's");
      expect(tx.entityType).toBe('merchant');
      expect(tx.category).toBe('Food & Dining');
      expect(tx.subcategory).toBe('Fast Food / Restaurant');
      expect(tx.currency).toBe('INR');
      expect(tx.balance).toBe(191352.62);
      expect(tx.needsReview).toBe(false);
      expect(tx.description).toContain('UPI/DR/496603932769/McDonald/YESB/MCDONALDSI/Paym');
    });
  });

  // Test Case 2: Exact prompt test case for individual transfer
  describe('Test Case 2: Individual Beneficiary P2P Transfer', () => {
    it('should identify S Sathish as individual beneficiary, classify as Person-to-Person Transfer, and avoid Food/Shopping misclassification', async () => {
      const csvContent = `Txn Date,Particulars,Debit,Credit,Balance\n15/04/2026,"UPI/DR/130091682221/S SATHISH/INDB/8050725200/Pay...",500.00,,54000.00`;
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = await StatementParser.parseCSV(buffer, { filename: 'test_individual.csv' });
      expect(result.transactions.length).toBe(1);
      const tx = result.transactions[0];

      expect(tx.entityName).toBe('S Sathish');
      expect(tx.entityType).toBe('individual');
      expect(tx.category).toBe('Personal Transfers');
      expect(tx.subcategory).toBe('Person-to-Person Transfer');
      expect(tx.paymentMethod).toBe('UPI');
      expect(tx.transactionType).toBe('debit');
      expect(tx.amount).toBe(500.00);
      expect(tx.balance).toBe(54000.00);
      expect(tx.currency).toBe('INR');
      expect(tx.category).not.toBe('Food & Dining');
      expect(tx.category).not.toBe('Shopping');
    });

    it('should flag for review if amount or description is incomplete', async () => {
      const incompleteCSV = `Txn Date,Particulars,Debit,Credit,Balance\n15/04/2026,"UPI/DR/incomplete",0.00,,54000.00`;
      const buffer = Buffer.from(incompleteCSV, 'utf-8');

      const result = await StatementParser.parseCSV(buffer, { filename: 'incomplete.csv' });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // Number Formatting & Currency Tests
  describe('Financial Number Parsing & Grouping', () => {
    it('should parse Indian numeral grouping (lakhs & crores)', () => {
      const parsed = CurrencyService.parseFinancialNumber('-1,91,352.62');
      expect(parsed).not.toBeNull();
      expect(parsed?.value).toBe(-191352.62);
      expect(parsed?.isNegative).toBe(true);
    });

    it('should parse International numeral grouping', () => {
      const parsed = CurrencyService.parseFinancialNumber('191,352.62');
      expect(parsed).not.toBeNull();
      expect(parsed?.value).toBe(191352.62);
      expect(parsed?.isNegative).toBe(false);
    });

    it('should parse European comma-decimal notation', () => {
      const parsed = CurrencyService.parseFinancialNumber('191.352,62');
      expect(parsed).not.toBeNull();
      expect(parsed?.value).toBe(191352.62);
    });

    it('should parse Dr and Cr suffixes', () => {
      const drParsed = CurrencyService.parseFinancialNumber('201.97 Dr');
      const crParsed = CurrencyService.parseFinancialNumber('1,500.00 Cr');
      expect(drParsed?.value).toBe(-201.97);
      expect(crParsed?.value).toBe(1500.00);
    });
  });

  describe('Currency Detection Hierarchy', () => {
    it('should detect explicit currency header code', () => {
      const text = 'HDFC Bank Statement\nAccount Currency: USD\nAccount Number: 123456';
      const det = CurrencyService.detectCurrency(text);
      expect(det.currency).toBe('USD');
      expect(det.needsReview).toBe(false);
    });

    it('should detect unambiguous currency symbols (INR ₹, EUR €, GBP £)', () => {
      const inrText = 'Total Debit: ₹ 1,500.00';
      const eurText = 'Invoice Amount: 450.00 €';
      const gbpText = 'Balance: £2,300.50';

      expect(CurrencyService.detectCurrency(inrText).currency).toBe('INR');
      expect(CurrencyService.detectCurrency(eurText).currency).toBe('EUR');
      expect(CurrencyService.detectCurrency(gbpText).currency).toBe('GBP');
    });

    it('should mark ambiguous dollar symbol as UNKNOWN with needsReview if no institution evidence', () => {
      const ambiguousText = 'Statement balance: $ 500.00 on 2026-04-10';
      const det = CurrencyService.detectCurrency(ambiguousText);
      expect(det.currency).toBe('UNKNOWN');
      expect(det.needsReview).toBe(true);
    });
  });

  // Multiline Narration Reconstruction
  describe('Multiline Narration Reconstruction', () => {
    it('should merge continuation rows without dates into the preceding transaction narration', async () => {
      const csv = `Date,Description,Amount,Balance\n2026-04-11,"UPI/DR/496603932769/McDonald/YESB/MCDONALDSI/Paym",-201.97,191352.62\n,"0097695162091 AT 10369 BEL FACTORY CAMPUS",,\n2026-04-12,"UBER TRIP RIDES",-15.50,191337.12`;
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await StatementParser.parseCSV(buffer, { filename: 'multiline.csv' });
      expect(result.transactions.length).toBe(2);

      const mcdTx = result.transactions[0];
      expect(mcdTx.description).toContain('UPI/DR/496603932769/McDonald/YESB/MCDONALDSI/Paym');
      expect(mcdTx.description).toContain('0097695162091 AT 10369 BEL FACTORY CAMPUS');
      expect(mcdTx.entityName).toBe("McDonald's");

      const uberTx = result.transactions[1];
      expect(uberTx.entityName).toBe('Uber');
      expect(uberTx.category).toBe('Transport');
    });
  });

  // Credits, Refunds, and Separate Debit/Credit Columns
  describe('Credits, Refunds, and Separate Columns', () => {
    it('should correctly separate debit and credit columns and categorize salary and refunds', async () => {
      const csv = `Date,Narration,Withdrawal (Dr),Deposit (Cr),Balance\n2026-04-01,"Monthly Payroll TechCorp Salary",,5000.00,5000.00\n2026-04-05,"Amazon Marketplace Merchant Refund",,45.99,5045.99\n2026-04-06,"Electricity Bill BESCOM Power",120.00,,4925.99`;
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await StatementParser.parseCSV(buffer, { filename: 'columns.csv' });
      expect(result.transactions.length).toBe(3);

      const salTx = result.transactions[0];
      expect(salTx.transactionType).toBe('credit');
      expect(salTx.category).toBe('Salary');
      expect(salTx.amount).toBe(5000.00);

      const refTx = result.transactions[1];
      expect(refTx.transactionType).toBe('credit');
      expect(refTx.category).toBe('Refunds');
      expect(refTx.subcategory).toBe('Merchant Refund');
      expect(refTx.amount).toBe(45.99);

      const billTx = result.transactions[2];
      expect(billTx.transactionType).toBe('debit');
      expect(billTx.category).toBe('Bills');
      expect(billTx.amount).toBe(120.00);
    });
  });

  // Excel (.xlsx) Parser Verification
  describe('Excel (.xlsx) Parsing', () => {
    it('should parse an Excel workbook with headers, amounts, and descriptions', async () => {
      const wb = xlsx.utils.book_new();
      const wsData = [
        ['Date', 'Narration', 'Amount', 'Balance'],
        ['2026-04-11', 'UPI/DR/496603932769/McDonald/YESB/MCDONALDSI/Paym', -201.97, 191352.62],
        ['2026-04-12', 'Starbucks Coffee Bangalore', -350.00, 191002.62],
      ];
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, 'Statement');
      const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = await StatementParser.parseExcel(excelBuffer, { filename: 'statement.xlsx' });
      expect(result.format).toBe('EXCEL');
      expect(result.transactions.length).toBe(2);
      expect(result.transactions[0].entityName).toBe("McDonald's");
      expect(result.transactions[1].entityName).toBe('Starbucks');
    });
  });

  // User Confirmed Merchant Learning
  describe('User Confirmed Merchant Learning & Memory', () => {
    it('should remember user confirmed merchant identity and category for future parsing', async () => {
      const userId = 'user-test-uuid-1';
      // User confirms that "chai point" should be categorized as Food & Dining -> Coffee Shops & Cafes
      MerchantCatalog.saveConfirmedRule(
        userId,
        'chai point',
        'Chai Point',
        'merchant',
        'Food & Dining',
        'Coffee Shops & Cafes'
      );

      const csv = `Date,Description,Amount\n2026-04-15,"POS 1234 CHAI POINT INDIRANAGAR",-140.00`;
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await StatementParser.parseCSV(buffer, { filename: 'chai.csv', userId });
      expect(result.transactions.length).toBe(1);

      const tx = result.transactions[0];
      expect(tx.entityName).toBe('Chai Point');
      expect(tx.category).toBe('Food & Dining');
      expect(tx.subcategory).toBe('Coffee Shops & Cafes');
      expect(tx.confidence).toBeGreaterThanOrEqual(0.98);
      expect(tx.evidence).toEqual(expect.arrayContaining([expect.stringContaining('user-confirmed rule')]));
    });
  });

  // Ambiguous & Unknown Transactions
  describe('Ambiguous Merchants and Review Flagging', () => {
    it('should flag ambiguous or unidentifiable narrations for review without guessing', () => {
      const classification = MerchantCatalog.classifyEntity('MISC DEBIT REF 999888777 XYZ123', -88.00);
      expect(classification.category).toBe('Uncategorized');
      expect(classification.subcategory).toBe('Needs Review');
      expect(classification.needsReview).toBe(true);
      expect(classification.confidence).toBeLessThan(0.70);
    });
  });

  // PDF Statement Multi-line Table Processing
  describe('PDF Statement Multi-line Table Processing', () => {
    it('should correctly parse real multi-line SBI bank statement PDF if available', async () => {
      const fs = require('fs');
      const pdfPath = 'C:/Users/adity/Downloads/AccountStatement_16102026_202945_unlocked.pdf';
      if (fs.existsSync(pdfPath)) {
        const buffer = fs.readFileSync(pdfPath);
        const result = await StatementParser.parsePDF(buffer, { filename: 'AccountStatement_16102026_202945_unlocked.pdf' });
        expect(result.format).toBe('PDF');
        expect(result.detectedCurrency).toBe('INR');
        expect(result.transactions.length).toBe(823);

        const credits = result.transactions.filter(t => t.transactionType === 'credit');
        const debits = result.transactions.filter(t => t.transactionType === 'debit');
        expect(credits.length).toBe(164);
        expect(debits.length).toBe(659);

        // Check running balance on last transaction
        const lastTx = result.transactions[result.transactions.length - 1];
        expect(lastTx.balance).toBe(88790.98);
      }
    });
  });
});

