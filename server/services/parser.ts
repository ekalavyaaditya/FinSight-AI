import pdf from 'pdf-parse';
import axios from 'axios';
import * as xlsx from 'xlsx';
import { CurrencyService } from './currency';
import { MerchantCatalog, EntityClassification } from './merchantCatalog';

export interface NormalizedTransaction {
  transactionDate: string; // YYYY-MM-DD
  valueDate?: string;      // YYYY-MM-DD
  description: string;     // Complete raw or concatenated narration
  entityName: string;      // Normalized entity (e.g. McDonald's or S Sathish)
  entityType: 'merchant' | 'individual' | 'financial_institution' | 'organization' | 'government' | 'unknown';
  transactionType: 'debit' | 'credit';
  paymentMethod: string;   // UPI, NEFT, CARD, etc.
  category: string;        // Food & Dining, Personal Transfers, etc.
  subcategory: string;     // Fast Food / Restaurant, Person-to-Person Transfer, etc.
  amount: number;          // Absolute positive float
  currency: string;        // ISO 4217 code or 'UNKNOWN'
  balance?: number;        // Running balance if available
  confidence: number;      // 0.0 to 1.0
  evidence: string[];
  needsReview: boolean;
  sourceFile?: string;
  sourceRow?: number;
  sourcePage?: number;
}

export interface ParseOptions {
  filename?: string;
  userId?: string;
}

export interface StatementParseOutput {
  transactions: NormalizedTransaction[];
  detectedCurrency: string;
  currencyConfidence: number;
  currencyEvidence: string[];
  totalRowsScanned: number;
  format: 'CSV' | 'EXCEL' | 'PDF';
  reviewCount: number;
  errors: string[];
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export class StatementParser {
  /**
   * Universal Date Parser handling DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MMM-YYYY
   */
  static parseDateToISO(rawDateStr: string, preferredFormat: 'DMY' | 'MDY' = 'DMY'): string | null {
    if (!rawDateStr) return null;
    const clean = rawDateStr.trim().replace(/[,\t]/g, '');

    // ISO format: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Alpha Month: DD-MMM-YYYY (e.g. 11-Apr-2026 or 11/Apr/2026)
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const alphaMatch = clean.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,4})[-/\s](\d{2,4})/);
    if (alphaMatch) {
      const day = alphaMatch[1].padStart(2, '0');
      const mStr = alphaMatch[2].slice(0, 3).toLowerCase();
      const mNum = monthNames[mStr];
      let year = alphaMatch[3];
      if (year.length === 2) year = '20' + year;
      if (mNum) return `${year}-${mNum}-${day}`;
    }

    // Numeric DMY or MDY: 11/04/2026 or 11-04-2026
    const numMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (numMatch) {
      let p1 = parseInt(numMatch[1], 10);
      let p2 = parseInt(numMatch[2], 10);
      let year = numMatch[3];
      if (year.length === 2) year = '20' + year;

      let day: number, month: number;
      if (p1 > 12) {
        // Must be DD/MM
        day = p1;
        month = p2;
      } else if (p2 > 12) {
        // Must be MM/DD
        month = p1;
        day = p2;
      } else {
        // Ambiguous, use preferredFormat (default DMY for Indian / European statements)
        if (preferredFormat === 'DMY') {
          day = p1;
          month = p2;
        } else {
          month = p1;
          day = p2;
        }
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Fallback Date object
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Batch classify ambiguous transactions with AI service
   */
  static async batchClassifyWithAI(
    transactions: NormalizedTransaction[]
  ): Promise<NormalizedTransaction[]> {
    const itemsNeedingAI = transactions.filter(t => t.confidence < 0.90 && t.category === 'Uncategorized');
    if (itemsNeedingAI.length === 0) return transactions;

    // Process items in chunks of 50 to avoid payload or AI service timeouts
    const CHUNK_SIZE = 50;
    for (let i = 0; i < itemsNeedingAI.length; i += CHUNK_SIZE) {
      const chunk = itemsNeedingAI.slice(i, i + CHUNK_SIZE);
      try {
        const payload = {
          transactions: chunk.map(t => ({
            id: t.sourceRow !== undefined ? String(t.sourceRow) : t.description,
            narration: t.description,
            amount: t.transactionType === 'debit' ? -t.amount : t.amount,
            transactionType: t.transactionType,
            paymentMethod: t.paymentMethod,
            currency: t.currency,
          })),
        };

        const res = await axios.post(`${AI_SERVICE_URL}/batch-classify`, payload, { timeout: 8000 });
        const aiResults: Array<any> = res.data?.results || [];

        const resultMap = new Map<string, any>();
        for (const item of aiResults) {
          resultMap.set(String(item.id), item);
        }

        for (const tx of chunk) {
          const key = tx.sourceRow !== undefined ? String(tx.sourceRow) : tx.description;
          const aiMatch = resultMap.get(key);
          if (aiMatch) {
            tx.entityName = aiMatch.entityName || tx.entityName;
            tx.entityType = aiMatch.entityType || tx.entityType;
            tx.category = aiMatch.category || tx.category;
            tx.subcategory = aiMatch.subcategory || tx.subcategory;
            tx.confidence = Math.max(tx.confidence, aiMatch.confidence || 0.85);
            if (aiMatch.evidence && Array.isArray(aiMatch.evidence)) {
              tx.evidence.push(...aiMatch.evidence);
            }
            tx.needsReview = aiMatch.needsReview !== undefined ? aiMatch.needsReview : (tx.confidence < 0.70);
          }
        }
      } catch (err: any) {
        // AI service timeout or offline - graceful fallback to local deterministic rules
        for (const tx of chunk) {
          if (tx.confidence < 0.60) {
            tx.needsReview = true;
            tx.evidence.push('AI service unavailable; deterministic rule assigned with low confidence');
          }
        }
      }
    }

    return transactions;
  }

  /**
   * Parse CSV Statement with delimiter sniffing, multiline merging, column positions, and currency detection
   */
  static async parseCSV(buffer: Buffer, options: ParseOptions = {}): Promise<StatementParseOutput> {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/);
    const errors: string[] = [];

    // Sniff delimiter from first non-empty lines: comma, semicolon, tab, pipe
    const sample = lines.slice(0, 10).join('\n');
    let delimiter = ',';
    const commaCount = (sample.match(/,/g) || []).length;
    const tabCount = (sample.match(/\t/g) || []).length;
    const pipeCount = (sample.match(/\|/g) || []).length;
    const semiCount = (sample.match(/;/g) || []).length;

    if (pipeCount > commaCount && pipeCount > tabCount) delimiter = '|';
    else if (tabCount > commaCount) delimiter = '\t';
    else if (semiCount > commaCount) delimiter = ';';

    // Locate header line
    let headerRowIdx = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim().toLowerCase());
      const hasDate = cols.some(c => c.includes('date') || c.includes('txn dt'));
      const hasAmt = cols.some(c => c.includes('amount') || c.includes('debit') || c.includes('withdrawal') || c.includes('dr') || c.includes('deposit'));
      if (hasDate && hasAmt) {
        headerRowIdx = i;
        headers = cols;
        break;
      }
    }

    // Default indices if no explicit header found
    let dateIdx = -1;
    let valueDateIdx = -1;
    let descIdx = -1;
    let refIdx = -1;
    let debitIdx = -1;
    let creditIdx = -1;
    let amountIdx = -1;
    let balanceIdx = -1;

    if (headerRowIdx !== -1) {
      dateIdx = headers.findIndex(h => h.includes('txn date') || (h.includes('date') && !h.includes('value')));
      valueDateIdx = headers.findIndex(h => h.includes('value date') || h.includes('val date'));
      descIdx = headers.findIndex(h => h.includes('narration') || h.includes('description') || h.includes('particulars') || h.includes('details') || h.includes('memo') || h.includes('desc'));
      refIdx = headers.findIndex(h => h.includes('chq') || h.includes('ref') || h.includes('cheque') || h.includes('utr'));
      debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('dr'));
      creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('cr'));
      amountIdx = headers.findIndex(h => (h.includes('amount') || h.includes('txn amt')) && !h.includes('balance'));
      balanceIdx = headers.findIndex(h => h.includes('balance') || h.includes('bal'));
    }

    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) descIdx = headers.length > 1 ? 1 : 0;
    if (amountIdx === -1 && debitIdx === -1 && creditIdx === -1) {
      amountIdx = headers.length > 2 ? 2 : 1;
    }

    // Detect Currency from the entire file and column headers
    const sampleDescriptions: string[] = [];
    const sampleAmounts: string[] = [];

    const rawRows: Array<{ cols: string[]; rowNum: number }> = [];
    const startLine = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const regex = new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      const cols = line.split(regex).map(p => p.replace(/^"|"$/g, '').trim());
      rawRows.push({ cols, rowNum: i + 1 });

      if (descIdx !== -1 && cols[descIdx]) sampleDescriptions.push(cols[descIdx]);
      if (amountIdx !== -1 && cols[amountIdx]) sampleAmounts.push(cols[amountIdx]);
      if (balanceIdx !== -1 && cols[balanceIdx]) sampleAmounts.push(cols[balanceIdx]);
    }

    const currencyResult = CurrencyService.detectCurrency(text, sampleDescriptions, sampleAmounts);

    // Multiline Reconstruction: merge lines where Date and Amount are missing into preceding narration
    const mergedTransactions: NormalizedTransaction[] = [];
    let currentTx: NormalizedTransaction | null = null;

    for (const { cols, rowNum } of rawRows) {
      const dateCell = cols[dateIdx] || '';
      const isoDate = this.parseDateToISO(dateCell);

      // Check if this row is a continuation row for the previous narration
      if (!isoDate && currentTx && cols.length > descIdx && cols[descIdx]) {
        const continuationText = cols[descIdx].trim();
        if (continuationText) {
          currentTx.description += ' ' + continuationText;
          // Re-classify with updated narration
          const reClass = MerchantCatalog.classifyEntity(
            currentTx.description,
            currentTx.amount,
            currentTx.transactionType,
            options.userId
          );
          currentTx.entityName = reClass.entityName;
          currentTx.entityType = reClass.entityType;
          currentTx.category = reClass.category;
          currentTx.subcategory = reClass.subcategory;
          currentTx.confidence = reClass.confidence;
          currentTx.evidence = reClass.evidence;
          currentTx.needsReview = reClass.needsReview || currentTx.currency === 'UNKNOWN';
          continue;
        }
      }

      if (!isoDate) continue; // Skip invalid or summary lines

      const valueDateCell = valueDateIdx !== -1 ? cols[valueDateIdx] : undefined;
      const isoValDate = valueDateCell ? this.parseDateToISO(valueDateCell) : undefined;

      // Build complete description by collecting all non-date, non-amount content columns
      const textParts: string[] = [];
      for (let c = 0; c < cols.length; c++) {
        if (c === dateIdx || c === valueDateIdx) continue;
        if (c === debitIdx || c === creditIdx) continue;
        if (headers.length > 0 && headers[headers.length - 1].includes('bal') && c >= cols.length - 2) continue;
        if (c === amountIdx || c === balanceIdx) continue;

        const val = cols[c].trim();
        if (val && !/^-?[\d,.]+%?$/.test(val)) {
          textParts.push(val);
        }
      }

      let fullDescription = textParts.length > 0 ? textParts.join(' ') : ((descIdx !== -1 ? cols[descIdx] : '') || 'Statement Transaction');
      if (refIdx !== -1 && cols[refIdx] && !fullDescription.includes(cols[refIdx])) {
        fullDescription = `${fullDescription} ${cols[refIdx]}`.trim();
      }

      // Extract amount & transaction direction based on column positions
      let parsedAmount = 0;
      let direction: 'debit' | 'credit' = 'debit';

      if (debitIdx !== -1 && creditIdx !== -1) {
        const debitRaw = cols[debitIdx];
        const creditRaw = cols[creditIdx];
        const debParsed = CurrencyService.parseFinancialNumber(debitRaw);
        const credParsed = CurrencyService.parseFinancialNumber(creditRaw);

        if (debParsed && debParsed.value > 0) {
          parsedAmount = Math.abs(debParsed.value);
          direction = 'debit';
        } else if (credParsed && credParsed.value > 0) {
          parsedAmount = Math.abs(credParsed.value);
          direction = 'credit';
        } else if (debParsed && debParsed.value !== 0) {
          parsedAmount = Math.abs(debParsed.value);
          direction = 'debit';
        }
      } else if (amountIdx !== -1 && cols[amountIdx]) {
        const numRes = CurrencyService.parseFinancialNumber(cols[amountIdx]);
        if (numRes) {
          parsedAmount = Math.abs(numRes.value);
          direction = numRes.isNegative ? 'debit' : 'credit';
        }
      }

      // Check balance
      let balanceVal: number | undefined;
      if (balanceIdx !== -1 && cols[balanceIdx]) {
        const balRes = CurrencyService.parseFinancialNumber(cols[balanceIdx]);
        if (balRes) balanceVal = Math.abs(balRes.value);
      }

      // Robust alignment: If headers end with balance and row ends with 2 numeric values (Amount, Balance)
      if (headers.length > 0 && headers[headers.length - 1].includes('bal') && cols.length >= 2) {
        const lastColNum = CurrencyService.parseFinancialNumber(cols[cols.length - 1]);
        const secondLastColNum = CurrencyService.parseFinancialNumber(cols[cols.length - 2]);
        if (lastColNum !== null && secondLastColNum !== null && !cols[cols.length - 1].includes('/') && !cols[cols.length - 2].includes('/')) {
          balanceVal = Math.abs(lastColNum.value);
          parsedAmount = Math.abs(secondLastColNum.value);
          direction = secondLastColNum.isNegative || /WDL|DR/i.test(fullDescription) || /WDL|DR/i.test(cols[0]) ? 'debit' : 'credit';
        }
      }

      if (parsedAmount <= 0) {
        errors.push(`Row ${rowNum}: Zero or unparseable transaction amount.`);
        continue;
      }

      // Classify Entity & Category
      const classification = MerchantCatalog.classifyEntity(
        fullDescription,
        direction === 'debit' ? -parsedAmount : parsedAmount,
        direction,
        options.userId
      );

      const needsRev = classification.needsReview || currencyResult.needsReview || currencyResult.currency === 'UNKNOWN';

      currentTx = {
        transactionDate: isoDate,
        valueDate: isoValDate || isoDate,
        description: fullDescription,
        entityName: classification.entityName,
        entityType: classification.entityType,
        transactionType: direction,
        paymentMethod: classification.paymentMethod,
        category: classification.category,
        subcategory: classification.subcategory,
        amount: parsedAmount,
        currency: currencyResult.currency,
        balance: balanceVal,
        confidence: classification.confidence,
        evidence: [...classification.evidence, ...currencyResult.evidence],
        needsReview: needsRev,
        sourceFile: options.filename,
        sourceRow: rowNum,
      };

      mergedTransactions.push(currentTx);
    }

    // Final AI batch refinement
    const finalized = await this.batchClassifyWithAI(mergedTransactions);

    return {
      transactions: finalized,
      detectedCurrency: currencyResult.currency,
      currencyConfidence: currencyResult.confidence,
      currencyEvidence: currencyResult.evidence,
      totalRowsScanned: rawRows.length,
      format: 'CSV',
      reviewCount: finalized.filter(t => t.needsReview).length,
      errors,
    };
  }

  /**
   * Parse Excel statements (.xlsx, .xls) using SheetJS
   */
  static async parseExcel(buffer: Buffer, options: ParseOptions = {}): Promise<StatementParseOutput> {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Convert rows to CSV string to reuse high-accuracy columnar logic
      const csvLines = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      );
      const csvBuffer = Buffer.from(csvLines.join('\n'), 'utf-8');

      const result = await this.parseCSV(csvBuffer, options);
      result.format = 'EXCEL';
      return result;
    } catch (err: any) {
      return {
        transactions: [],
        detectedCurrency: 'UNKNOWN',
        currencyConfidence: 0,
        currencyEvidence: ['Excel parsing failure: ' + (err.message || String(err))],
        totalRowsScanned: 0,
        format: 'EXCEL',
        reviewCount: 0,
        errors: ['Failed to read Excel workbook: ' + (err.message || String(err))],
      };
    }
  }

  /**
   * Parse PDF Bank Statements with table reconstruction, multi-column detection, and multiline support
   */
  static async parsePDF(buffer: Buffer, options: ParseOptions = {}): Promise<StatementParseOutput> {
    try {
      const data = await pdf(buffer);
      const fullText = data.text;
      const lines = fullText.split(/\r?\n/);
      const errors: string[] = [];

      // Sample descriptions and amounts for currency detection
      const sampleDescriptions: string[] = [];
      const sampleAmounts: string[] = [];

      // Detect currency across PDF header and body
      const currencyResult = CurrencyService.detectCurrency(fullText, sampleDescriptions, sampleAmounts);

      const parsedTransactions: NormalizedTransaction[] = [];
      let currentTx: NormalizedTransaction | null = null;

      // Strategy 1: Multi-line bank statement table parser (e.g. State Bank of India, HDFC, ICICI)
      // Group lines into transaction blocks starting with date line
      const rawBlocks: Array<{
        txnDateRaw: string;
        valDateRaw: string;
        lines: string[];
        lineNum: number;
      }> = [];

      let currentBlock: { txnDateRaw: string; valDateRaw: string; lines: string[]; lineNum: number } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Match transaction date lines: "01/04/202601/04/2026", "01/04/2026 01/04/2026", "01/04/2026", "01-04-2026"
        const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}))?$/);
        if (dateMatch && !line.includes(':')) {
          if (currentBlock) rawBlocks.push(currentBlock);
          currentBlock = {
            txnDateRaw: dateMatch[1],
            valDateRaw: dateMatch[2] || dateMatch[1],
            lines: [],
            lineNum: i + 1,
          };
        } else if (currentBlock) {
          currentBlock.lines.push(line);
        }
      }
      if (currentBlock) rawBlocks.push(currentBlock);

      const isNoiseLine = (l: string) =>
        /^(?:\d+)?Page\s*no\.?(?:\s*\d+)?$/i.test(l) ||
        /^Balance$/i.test(l) ||
        /^Statement Summary/i.test(l) ||
        /^Brought Forward/i.test(l) ||
        /^Dr Count/i.test(l) ||
        /^Please do not share/i.test(l) ||
        /^If your account is/i.test(l) ||
        /^This is a computer/i.test(l) ||
        /^\(\s*\)$/.test(l);

      for (const block of rawBlocks) {
        let amtInfo: { type: 'debit' | 'credit'; amount: number; balance?: number } | null = null;
        let amtLineIdx = -1;

        for (let j = 0; j < block.lines.length; j++) {
          const line = block.lines[j];

          // Pattern 1: Credit line: Ref '-' or Cheque/Digits, Debit '-', Credit amount, Balance
          // e.g. --5,000.001,14,231.59 or - - 5,000.00 1,14,231.59
          let m = line.match(/^(\d{4,8}|-)?\s*-\s*([\d,]+\.\d{2})\s*([\d,]+\.\d{2})$/);
          if (m) {
            amtInfo = {
              type: 'credit',
              amount: parseFloat(m[2].replace(/,/g, '')),
              balance: parseFloat(m[3].replace(/,/g, '')),
            };
            amtLineIdx = j;
            break;
          }

          // Pattern 2: Debit line: Ref '-' or Cheque/Digits, Debit amount, Credit '-', Balance
          // e.g. -5,000.00-1,09,231.59 or 7115452,12,776.00-97,494.34 or - 5,000.00 - 1,09,231.59
          m = line.match(/^(\d{4,8}|-)?\s*([\d,]+\.\d{2})\s*-\s*([\d,]+\.\d{2})$/);
          if (m) {
            amtInfo = {
              type: 'debit',
              amount: parseFloat(m[2].replace(/,/g, '')),
              balance: parseFloat(m[3].replace(/,/g, '')),
            };
            amtLineIdx = j;
            break;
          }

          // Pattern 3: Separated numbers: Ref (optional), Debit, Credit, Balance
          m = line.match(/^(\d{4,8}|-)?\s*([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/);
          if (m) {
            const deb = parseFloat(m[2].replace(/,/g, ''));
            const cred = parseFloat(m[3].replace(/,/g, ''));
            const bal = parseFloat(m[4].replace(/,/g, ''));
            if (deb > 0) {
              amtInfo = { type: 'debit', amount: deb, balance: bal };
              amtLineIdx = j;
              break;
            } else if (cred > 0) {
              amtInfo = { type: 'credit', amount: cred, balance: bal };
              amtLineIdx = j;
              break;
            }
          }
        }

        if (amtInfo && amtInfo.amount > 0) {
          const descLines = block.lines
            .slice(0, amtLineIdx)
            .filter(l => !isNoiseLine(l));
          const fullDesc = descLines.join(' ').replace(/\s+/g, ' ').trim() || 'Bank Transaction';

          const isoTxnDate = this.parseDateToISO(block.txnDateRaw);
          const isoValDate = (this.parseDateToISO(block.valDateRaw) || isoTxnDate) ?? undefined;

          if (isoTxnDate) {
            const classification = MerchantCatalog.classifyEntity(
              fullDesc,
              amtInfo.type === 'debit' ? -amtInfo.amount : amtInfo.amount,
              amtInfo.type,
              options.userId
            );

            parsedTransactions.push({
              transactionDate: isoTxnDate,
              valueDate: isoValDate,
              description: fullDesc,
              entityName: classification.entityName,
              entityType: classification.entityType,
              transactionType: amtInfo.type,
              paymentMethod: classification.paymentMethod,
              category: classification.category,
              subcategory: classification.subcategory,
              amount: amtInfo.amount,
              currency: currencyResult.currency,
              balance: amtInfo.balance,
              confidence: classification.confidence,
              evidence: [...classification.evidence, ...currencyResult.evidence],
              needsReview: classification.needsReview || currencyResult.needsReview || currencyResult.currency === 'UNKNOWN',
              sourceFile: options.filename,
              sourceRow: block.lineNum,
              sourcePage: 1,
            });
          }
        }
      }

      // Strategy 2: If no multi-line table blocks matched, fall back to line-by-line / pipe-delimited parsing
      if (parsedTransactions.length === 0) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Pipe-delimited row parsing
          if (line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
              const dateMatches = parts[0].match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/g);
              if (dateMatches && dateMatches.length > 0) {
                const txnDateISO = this.parseDateToISO(dateMatches[0]);
                const valDateISO = dateMatches.length > 1 ? this.parseDateToISO(dateMatches[1]) : txnDateISO;

                const amountCandidates: { val: number; raw: string; idx: number }[] = [];
                for (let colIdx = parts.length - 1; colIdx >= 1; colIdx--) {
                  const parsedNum = CurrencyService.parseFinancialNumber(parts[colIdx]);
                  if (parsedNum !== null && !parts[colIdx].includes('/') && parts[colIdx].length <= 25) {
                    amountCandidates.unshift({ val: parsedNum.value, raw: parts[colIdx], idx: colIdx });
                  }
                }

                if (amountCandidates.length >= 1 && txnDateISO) {
                  let txAmount = 0;
                  let balanceVal: number | undefined;
                  let usedColIndices = new Set<number>();

                  if (amountCandidates.length >= 2) {
                    txAmount = Math.abs(amountCandidates[0].val);
                    balanceVal = Math.abs(amountCandidates[1].val);
                    usedColIndices.add(amountCandidates[0].idx);
                    usedColIndices.add(amountCandidates[1].idx);
                  } else {
                    txAmount = Math.abs(amountCandidates[0].val);
                    usedColIndices.add(amountCandidates[0].idx);
                  }

                  const narrationParts: string[] = [];
                  for (let colIdx = 1; colIdx < parts.length; colIdx++) {
                    if (!usedColIndices.has(colIdx)) {
                      narrationParts.push(parts[colIdx]);
                    }
                  }
                  const fullNarration = narrationParts.join(' ').trim();

                  let direction: 'debit' | 'credit' = 'debit';
                  if (amountCandidates[0].val < 0 || /WDL|DR|WITHDRAWAL/i.test(parts[0]) || /WDL|DR/i.test(fullNarration)) {
                    direction = 'debit';
                  } else if (amountCandidates[0].val > 0 || /DEP|CR|DEPOSIT/i.test(parts[0])) {
                    direction = 'credit';
                  }

                  const classification = MerchantCatalog.classifyEntity(
                    fullNarration,
                    direction === 'debit' ? -txAmount : txAmount,
                    direction,
                    options.userId
                  );

                  currentTx = {
                    transactionDate: txnDateISO,
                    valueDate: valDateISO || txnDateISO,
                    description: fullNarration,
                    entityName: classification.entityName,
                    entityType: classification.entityType,
                    transactionType: direction,
                    paymentMethod: classification.paymentMethod,
                    category: classification.category,
                    subcategory: classification.subcategory,
                    amount: txAmount,
                    currency: currencyResult.currency,
                    balance: balanceVal,
                    confidence: classification.confidence,
                    evidence: [...classification.evidence, ...currencyResult.evidence],
                    needsReview: classification.needsReview || currencyResult.needsReview || currencyResult.currency === 'UNKNOWN',
                    sourceFile: options.filename,
                    sourceRow: i + 1,
                    sourcePage: 1,
                  };

                  parsedTransactions.push(currentTx);
                  continue;
                }
              }
            }
          }

          // Standard regex sweep for lines with Date + Description + Amount
          const standardMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([+-]?\$?₹?€?£?\s*[\d,]+\.\d{2})(?:\s+([+-]?\$?₹?€?£?\s*[\d,]+\.\d{2}))?$/);
          if (standardMatch) {
            const isoDate = this.parseDateToISO(standardMatch[1]);
            const desc = standardMatch[2].trim();
            const amt1 = CurrencyService.parseFinancialNumber(standardMatch[3]);
            const amt2 = standardMatch[4] ? CurrencyService.parseFinancialNumber(standardMatch[4]) : null;

            if (isoDate && amt1) {
              let txAmt = Math.abs(amt1.value);
              let balVal: number | undefined;

              if (amt2) {
                balVal = Math.abs(amt2.value);
              }

              const direction: 'debit' | 'credit' = amt1.isNegative || /DR|WDL/i.test(desc) ? 'debit' : 'credit';
              const classification = MerchantCatalog.classifyEntity(
                desc,
                direction === 'debit' ? -txAmt : txAmt,
                direction,
                options.userId
              );

              currentTx = {
                transactionDate: isoDate,
                valueDate: isoDate,
                description: desc,
                entityName: classification.entityName,
                entityType: classification.entityType,
                transactionType: direction,
                paymentMethod: classification.paymentMethod,
                category: classification.category,
                subcategory: classification.subcategory,
                amount: txAmt,
                currency: currencyResult.currency,
                balance: balVal,
                confidence: classification.confidence,
                evidence: [...classification.evidence, ...currencyResult.evidence],
                needsReview: classification.needsReview || currencyResult.needsReview || currencyResult.currency === 'UNKNOWN',
                sourceFile: options.filename,
                sourceRow: i + 1,
              };

              parsedTransactions.push(currentTx);
              continue;
            }
          }

          // Multiline Continuation: line without date or amount appended to previous narration
          if (currentTx && !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line) && !/(-?\d+[\.,]\d{2})/.test(line)) {
            if (!line.includes('Page ') && !line.includes('Statement of Account') && line.length > 2) {
              currentTx.description += ' ' + line.replace(/\|/g, ' ').trim();
              const reClass = MerchantCatalog.classifyEntity(
                currentTx.description,
                currentTx.amount,
                currentTx.transactionType,
                options.userId
              );
              currentTx.entityName = reClass.entityName;
              currentTx.entityType = reClass.entityType;
              currentTx.category = reClass.category;
              currentTx.subcategory = reClass.subcategory;
              currentTx.confidence = reClass.confidence;
              currentTx.evidence = reClass.evidence;
            }
          }
        }
      }

      // Final AI Batch classification refinement
      const finalized = await this.batchClassifyWithAI(parsedTransactions);

      return {
        transactions: finalized,
        detectedCurrency: currencyResult.currency,
        currencyConfidence: currencyResult.confidence,
        currencyEvidence: currencyResult.evidence,
        totalRowsScanned: lines.length,
        format: 'PDF',
        reviewCount: finalized.filter(t => t.needsReview).length,
        errors,
      };
    } catch (err: any) {
      return {
        transactions: [],
        detectedCurrency: 'UNKNOWN',
        currencyConfidence: 0,
        currencyEvidence: ['PDF parse exception: ' + (err.message || String(err))],
        totalRowsScanned: 0,
        format: 'PDF',
        reviewCount: 0,
        errors: ['PDF Extraction Failed: ' + (err.message || String(err))],
      };
    }
  }

  /**
   * Helper for backwards compatibility with legacy callers
   */
  static async classifyTransaction(description: string, amount: number): Promise<string> {
    const classification = MerchantCatalog.classifyEntity(description, amount);
    // Map to legacy Category enum
    const map: Record<string, string> = {
      'Food & Dining': 'FOOD',
      'Transport': 'TRAVEL',
      'Shopping': 'SHOPPING',
      'Bills': 'BILLS',
      'Healthcare': 'HEALTHCARE',
      'Salary': 'SALARY',
      'Personal Transfers': 'OTHERS',
      'Cash Withdrawals': 'OTHERS',
      'Bank Charges': 'OTHERS',
      'Loan Payments': 'EMI',
      'Investments': 'INVESTMENT',
      'Refunds': 'OTHERS',
      'Uncategorized': 'OTHERS',
    };
    return map[classification.category] || 'OTHERS';
  }
}
