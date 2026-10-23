/**
 * Currency Detection and Locale-Aware Number Formatting Service
 */

export interface NumberParseResult {
  value: number;
  isNegative: boolean;
  raw: string;
}

export interface CurrencyDetectionResult {
  currency: string; // ISO 4217 code or 'UNKNOWN'
  confidence: number;
  evidence: string[];
  needsReview: boolean;
}

const SUPPORTED_CURRENCIES: Record<string, { name: string; symbols: string[]; defaultCountry?: string }> = {
  INR: { name: 'Indian Rupee', symbols: ['₹', 'RS.', 'RS', 'INR'] },
  USD: { name: 'US Dollar', symbols: ['USD', 'US$'] },
  EUR: { name: 'Euro', symbols: ['€', 'EUR'] },
  GBP: { name: 'British Pound', symbols: ['£', 'GBP'] },
  AED: { name: 'UAE Dirham', symbols: ['AED', 'DHS', 'DH'] },
  CAD: { name: 'Canadian Dollar', symbols: ['CAD', 'C$'] },
  AUD: { name: 'Australian Dollar', symbols: ['AUD', 'A$'] },
  SGD: { name: 'Singapore Dollar', symbols: ['SGD', 'S$'] },
  JPY: { name: 'Japanese Yen', symbols: ['¥', 'JPY'] },
  CHF: { name: 'Swiss Franc', symbols: ['CHF'] },
};

export class CurrencyService {
  /**
   * Parse financial numbers from diverse statement notations:
   * - Indian lakh/crore grouping: 1,91,352.62
   * - International grouping: 191,352.62
   * - European comma decimal: 191.352,62 or 191 352,62
   * - Dr / Cr suffixes: 201.97 Dr, 1000.00 Cr
   * - Negative parens: (201.97)
   */
  static parseFinancialNumber(rawInput: any): NumberParseResult | null {
    if (rawInput === null || rawInput === undefined) return null;
    let str = String(rawInput).trim();
    if (!str) return null;

    let isNegative = false;

    // Check for trailing or leading '-'
    if (str.startsWith('-')) {
      isNegative = true;
      str = str.substring(1).trim();
    } else if (str.endsWith('-')) {
      isNegative = true;
      str = str.substring(0, str.length - 1).trim();
    }

    // Check for parentheses indicating negative: (100.00)
    if (str.startsWith('(') && str.endsWith(')')) {
      isNegative = true;
      str = str.substring(1, str.length - 1).trim();
    }

    // Check for Dr suffix (debit) or Cr (credit)
    const upper = str.toUpperCase();
    if (upper.endsWith(' DR') || upper.endsWith('DR')) {
      isNegative = true;
      str = str.replace(/DR$/i, '').trim();
    } else if (upper.endsWith(' CR') || upper.endsWith('CR')) {
      str = str.replace(/CR$/i, '').trim();
    }

    // Strip currency symbols and whitespace
    str = str.replace(/[₹$€£¥A-Za-z\s]/g, '').trim();
    if (!str) return null;

    let normalizedStr = str;

    // European format: 1.234,56 or 1234,56 (comma as decimal separator)
    if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(str) || (/^\d+,\d{2}$/.test(str) && !str.includes('.'))) {
      normalizedStr = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Handles both Indian (1,91,352.62) and International (191,352.62) grouping:
      // Strip all commas preceding the decimal dot
      normalizedStr = str.replace(/,/g, '');
    }

    const value = parseFloat(normalizedStr);
    if (isNaN(value)) return null;

    return {
      value: isNegative ? -Math.abs(value) : Math.abs(value),
      isNegative,
      raw: String(rawInput).trim(),
    };
  }

  /**
   * Automatically detect statement currency following strict evidence hierarchy:
   * 1. Explicit currency code in header/metadata (e.g. "Currency: INR", "INR")
   * 2. Header metadata / Account metadata
   * 3. Unambiguous currency symbols (₹ -> INR, € -> EUR, £ -> GBP, AED -> AED)
   * 4. Reliable contextual evidence (UPI rail, Indian IFSC bank codes, Indian grouping)
   * 5. If ambiguous (e.g. bare '$' with no US/Canada context), flag UNKNOWN and needsReview
   */
  static detectCurrency(
    statementText: string,
    sampleDescriptions: string[] = [],
    sampleAmounts: string[] = []
  ): CurrencyDetectionResult {
    const evidence: string[] = [];
    const textUpper = statementText.toUpperCase();

    // 1. Explicit Currency Headers: e.g. "CURRENCY: INR", "ACCOUNT CURRENCY: USD", "(IN INR)", "CURRENCY CODE: EUR"
    const explicitHeaderMatch = textUpper.match(/(?:CURRENCY|ACC(?:OUNT)?\s*CURRENCY|BASE\s*CURRENCY|STMT\s*CURRENCY)\s*[:=\-]\s*([A-Z]{3})/);
    if (explicitHeaderMatch && SUPPORTED_CURRENCIES[explicitHeaderMatch[1]]) {
      const code = explicitHeaderMatch[1];
      evidence.push(`Explicit statement header: '${explicitHeaderMatch[0]}'`);
      return {
        currency: code,
        confidence: 0.99,
        evidence,
        needsReview: false,
      };
    }

    // Check for explicit ISO codes near account details
    for (const code of ['INR', 'EUR', 'GBP', 'AED', 'USD', 'CAD', 'AUD', 'SGD', 'JPY']) {
      const regex = new RegExp(`\\b(?:IN\\s+)?${code}\\b`);
      if (regex.test(textUpper.slice(0, 1500))) {
        evidence.push(`Explicit ISO code '${code}' identified in statement header`);
        return {
          currency: code,
          confidence: 0.96,
          evidence,
          needsReview: false,
        };
      }
    }

    // 2. Unambiguous Currency Symbols
    if (statementText.includes('₹') || /\b(?:RS\.?|INR)\b/i.test(statementText)) {
      evidence.push("Unambiguous Indian Rupee symbol ('₹' or 'Rs.') present");
      return {
        currency: 'INR',
        confidence: 0.98,
        evidence,
        needsReview: false,
      };
    }
    if (statementText.includes('€')) {
      evidence.push("Euro currency symbol '€' present");
      return {
        currency: 'EUR',
        confidence: 0.98,
        evidence,
        needsReview: false,
      };
    }
    if (statementText.includes('£')) {
      evidence.push("British Pound currency symbol '£' present");
      return {
        currency: 'GBP',
        confidence: 0.98,
        evidence,
        needsReview: false,
      };
    }
    if (/\b(?:AED|DIRHAMS?)\b/i.test(statementText)) {
      evidence.push("UAE Dirham (AED) notation present");
      return {
        currency: 'AED',
        confidence: 0.97,
        evidence,
        needsReview: false,
      };
    }

    // 3. Reliable Contextual Evidence: UPI rail & Indian IFSC Bank Codes
    // UPI is exclusively an Indian banking network regulated by NPCI
    const hasUPIRail = sampleDescriptions.some(d => /UPI[/_-]/i.test(d)) || /UPI[/_-]/i.test(statementText);
    const hasIndianBankCode = sampleDescriptions.some(d =>
      /(?:YESB|INDB|SBIN|HDFC|ICIC|UTIB|PUNB|BARB|CNRB|KKBK|IOBA)/i.test(d)
    ) || /(?:YESB|INDB|SBIN|HDFC|ICIC|UTIB|PUNB|BARB|CNRB|KKBK|IOBA)/i.test(textUpper)
      || /(?:STATE BANK OF INDIA|HDFC BANK|ICICI BANK|AXIS BANK|PUNJAB NATIONAL BANK|KOTAK)/i.test(textUpper);

    // Check for Indian Lakh/Crore number grouping: 1,91,352.62
    const hasIndianGrouping = sampleAmounts.some(a => /\b\d{1,2},\d{2},\d{3}(?:\.\d{2})?\b/.test(a))
      || /\b\d{1,2},\d{2},\d{3}(?:\.\d{2})?\b/.test(statementText);

    if (hasUPIRail) {
      evidence.push("UPI transaction rail identified (NPCI infrastructure is strictly INR)");
      if (hasIndianBankCode) evidence.push("Indian banking institution / IFSC code identified");
      if (hasIndianGrouping) evidence.push("Indian numbering grouping (lakh/crore) observed");
      return {
        currency: 'INR',
        confidence: 0.95,
        evidence,
        needsReview: false,
      };
    }

    if (hasIndianBankCode && hasIndianGrouping) {
      evidence.push("Indian financial institution and lakh/crore numeral formatting verified");
      return {
        currency: 'INR',
        confidence: 0.92,
        evidence,
        needsReview: false,
      };
    }

    // 4. Disambiguation of '$':
    if (statementText.includes('$')) {
      if (/CHASE|BANK OF AMERICA|WELLS FARGO|CITIBANK|CAPITAL ONE|FIDELITY|VANGUARD/i.test(textUpper)) {
        evidence.push("US banking institution identified alongside '$' symbol");
        return {
          currency: 'USD',
          confidence: 0.95,
          evidence,
          needsReview: false,
        };
      }
      if (/RBC|TD BANK|SCOTIABANK|BMO|CIBC/i.test(textUpper)) {
        evidence.push("Canadian financial institution identified alongside '$' symbol");
        return {
          currency: 'CAD',
          confidence: 0.94,
          evidence,
          needsReview: false,
        };
      }
      if (/COMMBANK|WESTPAC|ANZ|NAB/i.test(textUpper)) {
        evidence.push("Australian financial institution identified alongside '$' symbol");
        return {
          currency: 'AUD',
          confidence: 0.94,
          evidence,
          needsReview: false,
        };
      }

      // Ambiguous '$' without institutional evidence: DO NOT assume USD
      evidence.push("Symbol '$' detected but insufficient institution/locale evidence to distinguish USD from CAD/AUD/SGD");
      return {
        currency: 'UNKNOWN',
        confidence: 0.40,
        evidence,
        needsReview: true,
      };
    }

    // 5. If evidence is insufficient, mark UNKNOWN and request clarification
    evidence.push("No explicit currency code, header metadata, or reliable institutional context found");
    return {
      currency: 'UNKNOWN',
      confidence: 0.0,
      evidence,
      needsReview: true,
    };
  }

  /**
   * Format amounts with locale-aware currency presentation
   */
  static formatAmount(amount: number, currency: string): string {
    const safeCurrency = currency && currency !== 'UNKNOWN' ? currency : 'USD';
    try {
      const locale = safeCurrency === 'INR' ? 'en-IN' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: safeCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${safeCurrency} ${amount.toFixed(2)}`;
    }
  }
}
