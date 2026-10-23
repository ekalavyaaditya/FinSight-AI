/**
 * Verified Merchant Catalog, Narration Deconstruction, and User Memory Store
 */

export interface ParsedNarration {
  rawNarration: string;
  paymentMethod: string;
  transactionType: 'debit' | 'credit' | 'unknown';
  reference?: string;
  rawEntity?: string;
  bankCode?: string;
  vpa?: string;
  remark?: string;
}

export interface EntityClassification {
  entityName: string;
  entityType: 'merchant' | 'individual' | 'financial_institution' | 'organization' | 'government' | 'unknown';
  category: string;
  subcategory: string;
  paymentMethod: string;
  transactionType: 'debit' | 'credit';
  confidence: number;
  evidence: string[];
  needsReview: boolean;
}

export interface ConfirmedRule {
  userId: string;
  pattern: string;
  entityName: string;
  entityType: 'merchant' | 'individual' | 'financial_institution' | 'organization';
  category: string;
  subcategory: string;
}

// In-memory persistent user confirmed mapping store
const USER_CONFIRMED_RULES: Map<string, ConfirmedRule[]> = new Map();

export const VERIFIED_MERCHANTS: Array<{
  keyword: string;
  canonicalName: string;
  category: string;
  subcategory: string;
}> = [
  // Fast Food & Dining
  { keyword: 'mcdonald', canonicalName: "McDonald's", category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },
  { keyword: 'burger king', canonicalName: 'Burger King', category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },
  { keyword: 'subway', canonicalName: 'Subway', category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },
  { keyword: 'starbucks', canonicalName: 'Starbucks', category: 'Food & Dining', subcategory: 'Coffee Shops & Cafes' },
  { keyword: 'domino', canonicalName: "Domino's Pizza", category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },
  { keyword: 'pizza hut', canonicalName: 'Pizza Hut', category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },
  { keyword: 'kfc', canonicalName: 'KFC', category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },
  { keyword: 'swiggy', canonicalName: 'Swiggy', category: 'Food & Dining', subcategory: 'Food Delivery' },
  { keyword: 'zomato', canonicalName: 'Zomato', category: 'Food & Dining', subcategory: 'Food Delivery' },
  { keyword: 'dunkin', canonicalName: "Dunkin'", category: 'Food & Dining', subcategory: 'Coffee Shops & Cafes' },
  { keyword: 'chipotle', canonicalName: 'Chipotle', category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },
  { keyword: 'taco bell', canonicalName: 'Taco Bell', category: 'Food & Dining', subcategory: 'Fast Food / Restaurant' },

  // Groceries & Retail
  { keyword: 'walmart', canonicalName: 'Walmart', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'whole foods', canonicalName: 'Whole Foods', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'trader joe', canonicalName: "Trader Joe's", category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'costco', canonicalName: 'Costco', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'kroger', canonicalName: 'Kroger', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'target', canonicalName: 'Target', category: 'Shopping', subcategory: 'General Retail' },
  { keyword: 'dmart', canonicalName: 'DMart', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'd-mart', canonicalName: 'DMart', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'avenue supermarts', canonicalName: 'DMart (Avenue Supermarts)', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'trent hypermarket', canonicalName: 'Trent Hypermarket (Star Bazaar)', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'star bazaar', canonicalName: 'Star Bazaar', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'smart point', canonicalName: 'Reliance Smart Point', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'corner house', canonicalName: 'Corner House Ice Cream', category: 'Food & Dining', subcategory: 'Ice Cream & Desserts' },
  { keyword: 'bigbasket', canonicalName: 'BigBasket', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'blinkit', canonicalName: 'Blinkit', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'zepto', canonicalName: 'Zepto', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },
  { keyword: 'reliance fresh', canonicalName: 'Reliance Fresh', category: 'Food & Dining', subcategory: 'Groceries & Supermarkets' },

  // Transport
  { keyword: 'uber', canonicalName: 'Uber', category: 'Transport', subcategory: 'Rideshare & Taxi' },
  { keyword: 'lyft', canonicalName: 'Lyft', category: 'Transport', subcategory: 'Rideshare & Taxi' },
  { keyword: 'ola', canonicalName: 'Ola Cabs', category: 'Transport', subcategory: 'Rideshare & Taxi' },
  { keyword: 'rapido', canonicalName: 'Rapido', category: 'Transport', subcategory: 'Rideshare & Taxi' },
  { keyword: 'indigo', canonicalName: 'IndiGo', category: 'Transport', subcategory: 'Airlines & Flights' },
  { keyword: 'air india', canonicalName: 'Air India', category: 'Transport', subcategory: 'Airlines & Flights' },
  { keyword: 'delta air', canonicalName: 'Delta Air Lines', category: 'Transport', subcategory: 'Airlines & Flights' },
  { keyword: 'united air', canonicalName: 'United Airlines', category: 'Transport', subcategory: 'Airlines & Flights' },
  { keyword: 'irctc', canonicalName: 'IRCTC', category: 'Transport', subcategory: 'Public Transit' },
  { keyword: 'bmtc', canonicalName: 'BMTC', category: 'Transport', subcategory: 'Public Transit' },
  { keyword: 'bmrcl', canonicalName: 'BMRCL Namma Metro', category: 'Transport', subcategory: 'Public Transit' },
  { keyword: 'shell', canonicalName: 'Shell', category: 'Transport', subcategory: 'Fuel & Gas' },
  { keyword: 'bpcl', canonicalName: 'BPCL', category: 'Transport', subcategory: 'Fuel & Gas' },
  { keyword: 'hpcl', canonicalName: 'HPCL', category: 'Transport', subcategory: 'Fuel & Gas' },
  { keyword: 'indian oil', canonicalName: 'Indian Oil', category: 'Transport', subcategory: 'Fuel & Gas' },

  // Shopping & Tech
  { keyword: 'amazon', canonicalName: 'Amazon', category: 'Shopping', subcategory: 'E-Commerce & Online' },
  { keyword: 'flipkart', canonicalName: 'Flipkart', category: 'Shopping', subcategory: 'E-Commerce & Online' },
  { keyword: 'myntra', canonicalName: 'Myntra', category: 'Shopping', subcategory: 'Clothing & Apparel' },
  { keyword: 'zara', canonicalName: 'Zara', category: 'Shopping', subcategory: 'Clothing & Apparel' },
  { keyword: 'h&m', canonicalName: 'H&M', category: 'Shopping', subcategory: 'Clothing & Apparel' },
  { keyword: 'nike', canonicalName: 'Nike', category: 'Shopping', subcategory: 'Clothing & Apparel' },
  { keyword: 'adidas', canonicalName: 'Adidas', category: 'Shopping', subcategory: 'Clothing & Apparel' },
  { keyword: 'apple store', canonicalName: 'Apple Store', category: 'Shopping', subcategory: 'Electronics' },
  { keyword: 'best buy', canonicalName: 'Best Buy', category: 'Shopping', subcategory: 'Electronics' },
  { keyword: 'ikea', canonicalName: 'IKEA', category: 'Shopping', subcategory: 'General Retail' },

  // Bills & Utilities
  { keyword: 'bescom', canonicalName: 'BESCOM Power', category: 'Bills', subcategory: 'Electricity' },
  { keyword: 'electricity', canonicalName: 'Electricity Bill', category: 'Bills', subcategory: 'Electricity' },
  { keyword: 'power', canonicalName: 'Electricity Bill', category: 'Bills', subcategory: 'Electricity' },
  { keyword: 'bda', canonicalName: 'Bangalore Development Authority', category: 'Bills', subcategory: 'Property Tax & Utilities' },
  { keyword: 'airtel', canonicalName: 'Airtel', category: 'Bills', subcategory: 'Mobile & Internet' },
  { keyword: 'jio', canonicalName: 'Reliance Jio', category: 'Bills', subcategory: 'Mobile & Internet' },
  { keyword: 'at&t', canonicalName: 'AT&T', category: 'Bills', subcategory: 'Mobile & Internet' },
  { keyword: 'verizon', canonicalName: 'Verizon', category: 'Bills', subcategory: 'Mobile & Internet' },
  { keyword: 't-mobile', canonicalName: 'T-Mobile', category: 'Bills', subcategory: 'Mobile & Internet' },
  { keyword: 'netflix', canonicalName: 'Netflix', category: 'Bills', subcategory: 'Subscriptions' },
  { keyword: 'spotify', canonicalName: 'Spotify', category: 'Bills', subcategory: 'Subscriptions' },
  { keyword: 'disney', canonicalName: 'Disney+', category: 'Bills', subcategory: 'Subscriptions' },
  { keyword: 'hulu', canonicalName: 'Hulu', category: 'Bills', subcategory: 'Subscriptions' },
  { keyword: 'comcast', canonicalName: 'Comcast Xfinity', category: 'Bills', subcategory: 'Mobile & Internet' },

  // Healthcare
  { keyword: 'cvs', canonicalName: 'CVS Pharmacy', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'walgreens', canonicalName: 'Walgreens', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'apollo pharmacy', canonicalName: 'Apollo Pharmacy', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'apollo pharmacies', canonicalName: 'Apollo Pharmacy', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'apollophar', canonicalName: 'Apollo Pharmacy', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'apollo', canonicalName: 'Apollo Pharmacy', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'optival health', canonicalName: 'MedPlus (Optival Health)', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'optival', canonicalName: 'MedPlus (Optival Health)', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'trust chemists', canonicalName: 'Trust Chemists & Druggists', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: 'medplus', canonicalName: 'MedPlus', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },
  { keyword: '1mg', canonicalName: 'Tata 1mg', category: 'Healthcare', subcategory: 'Pharmacies & Medicine' },

  // Investments
  { keyword: 'zerodha', canonicalName: 'Zerodha', category: 'Investments', subcategory: 'Stocks & Brokerage' },
  { keyword: 'groww', canonicalName: 'Groww', category: 'Investments', subcategory: 'Stocks & Brokerage' },
  { keyword: 'vanguard', canonicalName: 'Vanguard', category: 'Investments', subcategory: 'Mutual Funds & SIP' },
  { keyword: 'fidelity', canonicalName: 'Fidelity', category: 'Investments', subcategory: 'Mutual Funds & SIP' },
  { keyword: 'coinbase', canonicalName: 'Coinbase', category: 'Investments', subcategory: 'Cryptocurrency' }
];

export class MerchantCatalog {
  static saveConfirmedRule(
    userId: string,
    pattern: string,
    entityName: string,
    entityType: 'merchant' | 'individual' | 'financial_institution' | 'organization',
    category: string,
    subcategory: string
  ): void {
    const cleanPattern = pattern.trim().toLowerCase().replace(/\b\d{8,16}\b/g, '').trim();
    if (!cleanPattern) return;

    const existing = USER_CONFIRMED_RULES.get(userId) || [];
    const filtered = existing.filter(r => r.pattern !== cleanPattern);
    filtered.push({
      userId,
      pattern: cleanPattern,
      entityName,
      entityType,
      category,
      subcategory,
    });
    USER_CONFIRMED_RULES.set(userId, filtered);
  }

  static parseNarration(narration: string): ParsedNarration {
    const clean = narration.trim();

    // Standard UPI: UPI/DR/496603932769/McDonald/YESB/MCDONALDSI/Paym
    const upiMatch = clean.match(/UPI\/(DR|CR)\/([^/]+)\/([^/]+)\/([^/]+)(?:\/([^/]+))?(?:\/(.*))?/i);
    if (upiMatch) {
      return {
        rawNarration: clean,
        paymentMethod: 'UPI',
        transactionType: upiMatch[1].toUpperCase() === 'DR' ? 'debit' : 'credit',
        reference: upiMatch[2].trim(),
        rawEntity: upiMatch[3].trim(),
        bankCode: upiMatch[4].trim(),
        vpa: upiMatch[5]?.trim(),
        remark: upiMatch[6]?.trim(),
      };
    }

    // Secondary UPI: UPI-DR-ref-entity or UPI/ref/entity
    const upiAlt = clean.match(/UPI[-/](DR|CR)?[-/]?(\d{6,16})[-/]([^/-]+)/i);
    if (upiAlt) {
      return {
        rawNarration: clean,
        paymentMethod: 'UPI',
        transactionType: upiAlt[1]?.toUpperCase() === 'DR' ? 'debit' : (upiAlt[1]?.toUpperCase() === 'CR' ? 'credit' : 'unknown'),
        reference: upiAlt[2].trim(),
        rawEntity: upiAlt[3].trim(),
      };
    }

    // NEFT: NEFT/DR/N12345/ENTITY/BANK
    const neftMatch = clean.match(/NEFT[-/](DR|CR)?[-/]?([A-Z0-9]+)[-/]([^/-]+)/i);
    if (neftMatch) {
      return {
        rawNarration: clean,
        paymentMethod: 'NEFT',
        transactionType: neftMatch[1]?.toUpperCase() === 'DR' ? 'debit' : (neftMatch[1]?.toUpperCase() === 'CR' ? 'credit' : 'unknown'),
        reference: neftMatch[2].trim(),
        rawEntity: neftMatch[3].trim(),
      };
    }

    // IMPS: IMPS/P2A/123456/ENTITY/BANK or IMPS/123456/ENTITY
    const impsMatch = clean.match(/IMPS(?:\/(?:P2A|P2P))?\/(\d{6,16})\/([^/]+)/i);
    if (impsMatch) {
      return {
        rawNarration: clean,
        paymentMethod: 'IMPS',
        transactionType: 'unknown',
        reference: impsMatch[1].trim(),
        rawEntity: impsMatch[2].trim(),
      };
    }

    // POS / Card: POS 412345XXXXXX1234 STARBUCKS BANGALORE
    const posMatch = clean.match(/POS\s+(?:(?:\d{4,6}[X*]+\d{4})\s+)?([A-Za-z0-9\s&'\-]+)/i);
    if (posMatch) {
      return {
        rawNarration: clean,
        paymentMethod: 'CARD',
        transactionType: 'debit',
        rawEntity: posMatch[1].trim(),
      };
    }

    // ATM Cash:
    if (/ATM\s+WDL|CASH\s+WDL|ATM\s+CASH/i.test(clean)) {
      return {
        rawNarration: clean,
        paymentMethod: 'ATM_CASH',
        transactionType: 'debit',
        rawEntity: 'ATM Cash Withdrawal',
      };
    }

    // Check / Cheque:
    const chqMatch = clean.match(/(?:CHQ|CHEQUE)\s+(?:NO\s+)?(\d+)?\s*(?:PAID\s+TO|DEP\s+BY)?\s*([A-Za-z\s]+)?/i);
    if (chqMatch) {
      return {
        rawNarration: clean,
        paymentMethod: 'CHEQUE',
        transactionType: clean.includes('DEP') ? 'credit' : 'debit',
        reference: chqMatch[1],
        rawEntity: chqMatch[2]?.trim(),
      };
    }

    let inferredDirection: 'debit' | 'credit' | 'unknown' = 'unknown';
    if (/\/DR\/|\bDR\b|\bWDL\b|\bWITHDRAWAL\b/i.test(clean)) {
      inferredDirection = 'debit';
    } else if (/\/CR\/|\bCR\b|\bDEP\b|\bDEPOSIT\b/i.test(clean)) {
      inferredDirection = 'credit';
    }

    return {
      rawNarration: clean,
      paymentMethod: 'UNKNOWN',
      transactionType: inferredDirection,
      rawEntity: clean,
    };
  }

  static isLikelyIndividualName(name: string): boolean {
    if (!name || name.length < 2) return false;
    const upper = name.trim().toUpperCase();

    // Banking, corporate, and system keywords that disqualify person names
    const nonPersonKeywords = [
      'LTD', 'LIMITED', 'PVT', 'PRIVATE', 'INC', 'CORP', 'CORPORATION', 'CO',
      'STORE', 'SHOP', 'MART', 'ENTERPRISE', 'ENTERPRISES', 'SERVICES', 'SOLUTIONS',
      'FOOD', 'HOTEL', 'RESTAURANT', 'CAFE', 'BAKERY', 'PHARMACY', 'HOSPITAL',
      'CLINIC', 'SUPERMARKET', 'PETROL', 'FUELS', 'VENTURES', 'HOLDINGS',
      'BANK', 'FINANCE', 'PAYMENTS', 'PAYTM', 'BHARATPE', 'RAZORPAY', 'PHONEPE',
      'CASHFREE', 'AIRTEL', 'JIO', 'MCDONALD', 'STARBUCKS', 'SWIGGY', 'ZOMATO',
      'POS', 'MERCHANT', 'BILLDESK', 'CCAVENUE',
      // Financial and transaction terms:
      'SALARY', 'PAYROLL', 'WAGES', 'STIPEND', 'DIRECT DEP', 'SAL CR',
      'DEBIT', 'CREDIT', 'REF', 'REFERENCE', 'TRANSFER', 'TFR', 'TRF', 'WDL', 'DEP',
      'MISC', 'CHARGES', 'CHARGE', 'FEE', 'FEES', 'BILL', 'BILLS', 'PAYMENT', 'TAX', 'TAXES',
      'INTEREST', 'DIVIDEND', 'REFUND', 'REVERSAL', 'ATM', 'CASH', 'BRANCH', 'ONLINE',
      'INSURANCE', 'EMI', 'LOAN', 'INVESTMENT', 'MUTUAL FUND', 'BROKERAGE'
    ];

    for (const kw of nonPersonKeywords) {
      const reg = new RegExp(`\\b${kw}\\b`);
      if (reg.test(upper)) return false;
    }

    // Must consist only of alpha characters, spaces, and periods (initials)
    if (!/^[A-Z\s.]+$/.test(upper)) return false;

    // Pattern 1: Initial(s) + Name (e.g. "S SATHISH", "M K SHARMA", "A.K. PATEL")
    if (/^(?:[A-Z]\.?\s+)+[A-Z]{2,}$/.test(upper)) {
      return true;
    }

    // Pattern 2: Name + Initial(s) (e.g. "SATHISH S", "RESHMA S M")
    if (/^[A-Z]{2,}(?:\s+[A-Z]\.?)+$/.test(upper)) {
      return true;
    }

    // Pattern 3: Honorific + Name (e.g. "MR SATHISH", "MRS ANJALI")
    if (/^(?:MR|MRS|MS|DR|PROF)\.?\s+[A-Z]{2,}$/i.test(upper)) {
      return true;
    }

    // Pattern 4: Standard 2-3 word personal name where each word is 2-15 letters
    const words = upper.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 3) {
      const allWordsAlpha = words.every(w => w.length >= 2 && w.length <= 15 && /^[A-Z]+$/.test(w));
      if (allWordsAlpha) return true;
    }

    return false;
  }

  static normalizePersonName(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map(part => {
        if (part.length <= 1) return part.toUpperCase();
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');
  }

  static classifyEntity(
    narration: string,
    amount: number,
    columnDirection?: 'debit' | 'credit',
    userId?: string
  ): EntityClassification {
    const evidence: string[] = [];
    const parsed = this.parseNarration(narration);

    const direction = columnDirection || (parsed.transactionType !== 'unknown' ? parsed.transactionType : (amount < 0 ? 'debit' : 'credit'));
    const method = parsed.paymentMethod;
    const rawEntity = parsed.rawEntity || narration;
    const narrationLower = narration.toLowerCase();

    // 1. Check user-confirmed mappings first
    if (userId) {
      const userRules = USER_CONFIRMED_RULES.get(userId) || [];
      for (const rule of userRules) {
        if (narrationLower.includes(rule.pattern) || rawEntity.toLowerCase().includes(rule.pattern)) {
          evidence.push(`Matched user-confirmed rule: '${rule.pattern}'`);
          return {
            entityName: rule.entityName,
            entityType: rule.entityType,
            category: rule.category,
            subcategory: rule.subcategory,
            paymentMethod: method,
            transactionType: direction,
            confidence: 0.99,
            evidence,
            needsReview: false,
          };
        }
      }
    }

    // 2. Check for Merchant Refunds & Reversals before standard debit classification
    const isRefundOrReversal = /\b(?:REFUND|REVERSAL|REV:|CASHBACK)\b/i.test(narration);
    if (isRefundOrReversal) {
      for (const merchant of VERIFIED_MERCHANTS) {
        if (rawEntity.toLowerCase().includes(merchant.keyword) || narrationLower.includes(merchant.keyword)) {
          evidence.push(`Matched verified merchant '${merchant.canonicalName}' on refund/reversal`);
          evidence.push('Transaction categorized under Refunds -> Merchant Refund');
          return {
            entityName: merchant.canonicalName,
            entityType: 'merchant',
            category: 'Refunds',
            subcategory: 'Merchant Refund',
            paymentMethod: method,
            transactionType: 'credit',
            confidence: 0.98,
            evidence,
            needsReview: false,
          };
        }
      }

      evidence.push('Transaction reversal or merchant refund identified');
      return {
        entityName: rawEntity !== narration ? rawEntity : 'Merchant Refund',
        entityType: 'merchant',
        category: 'Refunds',
        subcategory: 'Merchant Refund',
        paymentMethod: method,
        transactionType: 'credit',
        confidence: 0.90,
        evidence,
        needsReview: false,
      };
    }

    // 3. Check Verified Merchant Catalog
    for (const merchant of VERIFIED_MERCHANTS) {
      if (rawEntity.toLowerCase().includes(merchant.keyword) || narrationLower.includes(merchant.keyword)) {
        evidence.push(`Matched verified merchant catalog for '${merchant.canonicalName}' on keyword '${merchant.keyword}'`);
        if (method !== 'UNKNOWN') evidence.push(`Payment rail: ${method}`);
        evidence.push(`Transaction direction: ${direction}`);

        return {
          entityName: merchant.canonicalName,
          entityType: 'merchant',
          category: merchant.category,
          subcategory: merchant.subcategory,
          paymentMethod: method,
          transactionType: direction,
          confidence: 0.98,
          evidence,
          needsReview: false,
        };
      }
    }

    // 3. ATM Cash Withdrawals
    if (method === 'ATM_CASH' || /ATM\s+WDL|CASH\s+WDL/i.test(narration)) {
      evidence.push('ATM or branch cash withdrawal indicator detected');
      return {
        entityName: 'Cash Withdrawal',
        entityType: 'financial_institution',
        category: 'Cash Withdrawals',
        subcategory: 'ATM Withdrawal',
        paymentMethod: 'ATM_CASH',
        transactionType: 'debit',
        confidence: 0.99,
        evidence,
        needsReview: false,
      };
    }

    // 4. Bank Charges & Account Fees
    if (/\b(?:CHRG|CHARGE|FEE|SMS ALERT|ANNUAL FEE|MAINT|PENALTY|MIN BAL)\b/i.test(narration)) {
      evidence.push('Bank fee or account service charge pattern identified');
      return {
        entityName: 'Bank Charges',
        entityType: 'financial_institution',
        category: 'Bank Charges',
        subcategory: 'Account Maintenance',
        paymentMethod: method,
        transactionType: 'debit',
        confidence: 0.95,
        evidence,
        needsReview: false,
      };
    }

    // 5. Salary / Direct Deposit
    if (/\b(?:SALARY|PAYROLL|DIRECT DEP|SAL CR)\b/i.test(narration)) {
      evidence.push('Salary or payroll deposit pattern identified');
      return {
        entityName: rawEntity !== narration ? this.normalizePersonName(rawEntity) : 'Employer Payroll',
        entityType: 'organization',
        category: 'Salary',
        subcategory: 'Payroll',
        paymentMethod: method !== 'UNKNOWN' ? method : 'NET_BANKING',
        transactionType: 'credit',
        confidence: 0.95,
        evidence,
        needsReview: false,
      };
    }

    // 6. Loan / EMI / Mortgage
    if (/\b(?:EMI|LOAN PAYOFF|MORTGAGE|LOAN REP)\b/i.test(narration)) {
      evidence.push('Loan or EMI installment pattern identified');
      return {
        entityName: rawEntity !== narration ? rawEntity : 'Loan Provider',
        entityType: 'financial_institution',
        category: 'Loan Payments',
        subcategory: 'Personal Loan EMI',
        paymentMethod: method,
        transactionType: 'debit',
        confidence: 0.92,
        evidence,
        needsReview: false,
      };
    }

    // 7. Tax Refunds & Debits
    if (/\b(?:TAX REFUND|IRS REFUND|IT REFUND)\b/i.test(narration)) {
      evidence.push('Tax refund pattern identified');
      return {
        entityName: 'Tax Authority',
        entityType: 'government',
        category: 'Refunds',
        subcategory: 'Tax Refund',
        paymentMethod: method,
        transactionType: 'credit',
        confidence: 0.95,
        evidence,
        needsReview: false,
      };
    }
    if (/\b(?:TAX|IRS|INCOMETAX|TDS)\b/i.test(narration)) {
      evidence.push('Tax payment pattern identified');
      return {
        entityName: 'Tax Authority',
        entityType: 'government',
        category: 'Bills',
        subcategory: 'Government Fees',
        paymentMethod: method,
        transactionType: 'debit',
        confidence: 0.90,
        evidence,
        needsReview: false,
      };
    }

    // 8. Refunds & Reversals
    if (/\b(?:REFUND|REVERSAL|REV:|CASHBACK)\b/i.test(narration)) {
      evidence.push('Transaction reversal or merchant refund identified');
      return {
        entityName: rawEntity !== narration ? rawEntity : 'Merchant Refund',
        entityType: 'merchant',
        category: 'Refunds',
        subcategory: 'Merchant Refund',
        paymentMethod: method,
        transactionType: 'credit',
        confidence: 0.90,
        evidence,
        needsReview: false,
      };
    }

    // 9. Sweep / Term Deposit Transfers
    if (/SWEEP\s+T[RF]{2}/i.test(narration)) {
      evidence.push('Bank auto-sweep / mod balance transfer identified');
      return {
        entityName: 'Auto-Sweep Transfer',
        entityType: 'financial_institution',
        category: 'Personal Transfers',
        subcategory: 'Auto-Sweep Transfer',
        paymentMethod: method !== 'UNKNOWN' ? method : 'INTERNAL_TRANSFER',
        transactionType: direction,
        confidence: 0.98,
        evidence,
        needsReview: false,
      };
    }

    // 10. Interest Credit
    if (/\b(?:INTEREST\s+CREDIT|INT(?:EREST)?\s+TRF|INT\.?PD)\b/i.test(narration)) {
      evidence.push('Bank account interest credit identified');
      return {
        entityName: 'Bank Interest',
        entityType: 'financial_institution',
        category: 'Investments',
        subcategory: 'Savings Interest',
        paymentMethod: 'INTERNAL_TRANSFER',
        transactionType: 'credit',
        confidence: 0.98,
        evidence,
        needsReview: false,
      };
    }

    // 11. Annuity / Pension
    if (/\b(?:ANNUITY|PENSION)\b/i.test(narration)) {
      evidence.push('Annuity or pension disbursement identified');
      return {
        entityName: 'Annuity Provider',
        entityType: 'financial_institution',
        category: 'Salary',
        subcategory: 'Pension & Annuity',
        paymentMethod: method !== 'UNKNOWN' ? method : 'NET_BANKING',
        transactionType: 'credit',
        confidence: 0.96,
        evidence,
        needsReview: false,
      };
    }

    // 12. Dividends
    if (/\b(?:DIVIDEND|DIV\s+\d+|TATACAPITALDIV|TATASTEELDIV)\b/i.test(narration)) {
      evidence.push('Corporate dividend disbursement identified');
      return {
        entityName: rawEntity !== narration ? rawEntity : 'Dividend',
        entityType: 'organization',
        category: 'Investments',
        subcategory: 'Dividends',
        paymentMethod: method !== 'UNKNOWN' ? method : 'ACH_CREDIT',
        transactionType: 'credit',
        confidence: 0.96,
        evidence,
        needsReview: false,
      };
    }

    // 13. Person-to-Person Individual Transfers
    if (this.isLikelyIndividualName(rawEntity)) {
      const cleanPersonName = this.normalizePersonName(rawEntity);
      evidence.push(`Identified probable individual beneficiary: ${cleanPersonName}`);
      if (['UPI', 'IMPS', 'NEFT', 'RTGS'].includes(method)) {
        evidence.push(`P2P electronic transfer rail: ${method}`);
      }
      evidence.push('No corporate identifiers or merchant signals detected');

      return {
        entityName: cleanPersonName,
        entityType: 'individual',
        category: 'Personal Transfers',
        subcategory: 'Person-to-Person Transfer',
        paymentMethod: method,
        transactionType: direction,
        confidence: 0.94,
        evidence,
        needsReview: false,
      };
    }

    // 10. Ambiguous / Unrecognized Entity -> Flag for review
    evidence.push('Narration does not contain verified merchant, recognized individual, or standard banking keywords');
    const fallbackCleanName = rawEntity.replace(/^UPI[/_-]|NEFT[/_-]|IMPS[/_-]/i, '').split('/')[0].trim();

    return {
      entityName: fallbackCleanName || 'Unrecognized Transaction',
      entityType: 'unknown',
      category: 'Uncategorized',
      subcategory: 'Needs Review',
      paymentMethod: method,
      transactionType: direction,
      confidence: 0.35,
      evidence,
      needsReview: true,
    };
  }
}
