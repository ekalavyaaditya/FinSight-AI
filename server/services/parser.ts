import pdf from 'pdf-parse';
import axios from 'axios';

interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  category: string;
  merchant?: string;
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai:8000';

export class StatementParser {
  /**
   * Helper to fetch category from FastAPI AI service, with safe fallback
   */
  static async classifyTransaction(description: string, amount: number): Promise<string> {
    try {
      // Use short timeout so we don't block the upload if AI service is starting up
      const response = await axios.post(`${AI_SERVICE_URL}/classify`, {
        description,
        amount,
      }, { timeout: 1500 });
      return response.data.category || 'OTHERS';
    } catch {
      // Robust TypeScript Local Heuristic Fallback
      const descLower = description.toLowerCase();
      if (descLower.includes('salary') || descLower.includes('payroll') || descLower.includes('direct dep')) return 'SALARY';
      if (descLower.includes('rent') || descLower.includes('apartment') || descLower.includes('landlord')) return 'RENT';
      if (descLower.includes('starbucks') || descLower.includes('food') || descLower.includes('grocery') || descLower.includes('mcdonald') || descLower.includes('walmart') || descLower.includes('whole foods')) return 'FOOD';
      if (descLower.includes('uber') || descLower.includes('lyft') || descLower.includes('flight') || descLower.includes('airline') || descLower.includes('transit')) return 'TRAVEL';
      if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('hulu') || descLower.includes('disney')) return 'ENTERTAINMENT';
      if (descLower.includes('vanguard') || descLower.includes('fidelity') || descLower.includes('investment') || descLower.includes('brokerage')) return 'INVESTMENT';
      if (descLower.includes('power') || descLower.includes('water') || descLower.includes('electricity') || descLower.includes('gas') || descLower.includes('internet')) return 'UTILITIES';
      if (descLower.includes('phone') || descLower.includes('verizon') || descLower.includes('bill') || descLower.includes('at&t')) return 'BILLS';
      if (descLower.includes('emi') || descLower.includes('loan') || descLower.includes('mortgage')) return 'EMI';
      if (descLower.includes('tax') || descLower.includes('irs')) return 'TAX';
      return 'OTHERS';
    }
  }

  /**
   * Parse CSV bank statement
   */
  static async parseCSV(buffer: Buffer): Promise<ParsedTransaction[]> {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/);
    const transactions: ParsedTransaction[] = [];

    if (lines.length < 2) return [];

    // Parse header to find column indices
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('memo') || h.includes('text') || h.includes('name'));
    const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('sum') || h.includes('total'));
    const merchantIdx = headers.findIndex(h => h.includes('merchant') || h.includes('payee'));

    // If matching headers fails, fallback to standard [0: date, 1: desc, 2: amount]
    const activeDateIdx = dateIdx !== -1 ? dateIdx : 0;
    const activeDescIdx = descIdx !== -1 ? descIdx : 1;
    const activeAmtIdx = amtIdx !== -1 ? amtIdx : 2;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Smart split that respects quotes (e.g. CSV with comma inside text)
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length <= Math.max(activeDateIdx, activeDescIdx, activeAmtIdx)) continue;

      const rawDate = parts[activeDateIdx];
      const description = parts[activeDescIdx] || 'Unidentified Transaction';
      const rawAmount = parts[activeAmtIdx];
      const merchant = merchantIdx !== -1 ? parts[merchantIdx] : description.split(' ')[0];

      const date = new Date(rawDate);
      const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, ''));

      if (isNaN(date.getTime()) || isNaN(amount)) {
        continue; // Skip invalid rows
      }

      // Categorize
      const category = await this.classifyTransaction(description, amount);

      transactions.push({
        date,
        description,
        amount,
        category,
        merchant,
      });
    }

    return transactions;
  }

  /**
   * Parse PDF Bank statement using regex scanners on pdf text
   */
  static async parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
    try {
      const data = await pdf(buffer);
      const text = data.text;
      const lines = text.split('\n');
      const transactions: ParsedTransaction[] = [];

      // Regex to match lines containing a date followed by description and decimal amount
      // Standard formats: MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD
      const transactionRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+([\w\s&.,#\'\-*]+?)\s+(-?\$?\s?\d+[\.,]\d{2})/g;

      let match;
      // We can also run a line-by-line regex sweep
      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        // Reset regex index
        transactionRegex.lastIndex = 0;
        match = transactionRegex.exec(cleanLine);

        if (match) {
          const rawDate = match[1];
          const description = match[2].trim();
          const rawAmount = match[3];

          const date = new Date(rawDate);
          // Clean currency symbols and commas
          const cleanAmountStr = rawAmount.replace(/[\$\s,]/g, '');
          const amount = parseFloat(cleanAmountStr);

          if (!isNaN(date.getTime()) && !isNaN(amount)) {
            const category = await this.classifyTransaction(description, amount);
            transactions.push({
              date,
              description,
              amount,
              category,
              merchant: description.split(' ')[0],
            });
          }
        }
      }

      // If regex scanning missed everything, do a backup heuristic parser
      if (transactions.length === 0) {
        // Just extract anything resembling amounts with a description line
        const linesWithAmounts = lines.filter(l => /(-?\$?\d+[\.,]\d{2})/.test(l));
        for (const line of linesWithAmounts.slice(0, 20)) { // limit fallback to prevent spam
          const cleanLine = line.trim();
          const amountMatch = cleanLine.match(/(-?\$?\d+[\.,]\d{2})/);
          if (amountMatch) {
            const amountStr = amountMatch[1].replace(/[\$\s,]/g, '');
            const amount = parseFloat(amountStr);
            const desc = cleanLine.replace(amountMatch[1], '').trim() || 'Statement Transaction';
            const date = new Date(); // fallback to current date

            if (!isNaN(amount)) {
              const category = await this.classifyTransaction(desc, amount);
              transactions.push({
                date,
                description: desc,
                amount,
                category,
                merchant: desc.split(' ')[0],
              });
            }
          }
        }
      }

      return transactions;
    } catch (err: any) {
      console.error('PDF Parsing failed:', err);
      return [];
    }
  }
}
