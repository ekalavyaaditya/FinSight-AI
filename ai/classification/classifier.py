import re
import os
from typing import Dict, Any, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Standard categories and subcategories
CATEGORY_HIERARCHY = {
    "Food & Dining": [
        "Fast Food / Restaurant",
        "Groceries & Supermarkets",
        "Coffee Shops & Cafes",
        "Food Delivery"
    ],
    "Transport": [
        "Rideshare & Taxi",
        "Public Transit",
        "Airlines & Flights",
        "Fuel & Gas",
        "Vehicle Maintenance"
    ],
    "Shopping": [
        "E-Commerce & Online",
        "Clothing & Apparel",
        "Electronics",
        "General Retail"
    ],
    "Bills": [
        "Mobile & Internet",
        "Electricity & Power",
        "Water & Utilities",
        "Gas Utility",
        "Subscriptions"
    ],
    "Healthcare": [
        "Pharmacies & Medicine",
        "Doctor & Clinic",
        "Hospital",
        "Health Insurance"
    ],
    "Salary": [
        "Payroll",
        "Direct Deposit",
        "Bonus"
    ],
    "Personal Transfers": [
        "Person-to-Person Transfer",
        "Family Support",
        "Peer Payment"
    ],
    "Cash Withdrawals": [
        "ATM Withdrawal",
        "Branch Cash Withdrawal"
    ],
    "Bank Charges": [
        "Account Maintenance",
        "SMS Alert Fee",
        "Late Fee",
        "Overdraft Fee",
        "Interest Charge"
    ],
    "Loan Payments": [
        "Home Loan EMI",
        "Auto Loan EMI",
        "Personal Loan EMI",
        "Credit Card Bill"
    ],
    "Investments": [
        "Mutual Funds & SIP",
        "Stocks & Brokerage",
        "Fixed Deposit",
        "Cryptocurrency"
    ],
    "Refunds": [
        "Merchant Refund",
        "Reversal",
        "Tax Refund"
    ],
    "Uncategorized": [
        "General",
        "Needs Review"
    ]
}

# Verified Merchant Catalog: Pattern / Keyword -> (Canonical Name, Category, Subcategory)
VERIFIED_MERCHANTS: List[Tuple[str, str, str, str]] = [
    # Food & Dining
    ("mcdonald", "McDonald's", "Food & Dining", "Fast Food / Restaurant"),
    ("burger king", "Burger King", "Food & Dining", "Fast Food / Restaurant"),
    ("subway", "Subway", "Food & Dining", "Fast Food / Restaurant"),
    ("starbucks", "Starbucks", "Food & Dining", "Coffee Shops & Cafes"),
    ("domino", "Domino's Pizza", "Food & Dining", "Fast Food / Restaurant"),
    ("pizza hut", "Pizza Hut", "Food & Dining", "Fast Food / Restaurant"),
    ("kfc", "KFC", "Food & Dining", "Fast Food / Restaurant"),
    ("swiggy", "Swiggy", "Food & Dining", "Food Delivery"),
    ("zomato", "Zomato", "Food & Dining", "Food Delivery"),
    ("dunkin", "Dunkin'", "Food & Dining", "Coffee Shops & Cafes"),
    ("taco bell", "Taco Bell", "Food & Dining", "Fast Food / Restaurant"),
    ("chipotle", "Chipotle", "Food & Dining", "Fast Food / Restaurant"),
    ("cafe coffee day", "Cafe Coffee Day", "Food & Dining", "Coffee Shops & Cafes"),
    ("barista", "Barista", "Food & Dining", "Coffee Shops & Cafes"),

    # Groceries
    ("walmart", "Walmart", "Food & Dining", "Groceries & Supermarkets"),
    ("whole foods", "Whole Foods", "Food & Dining", "Groceries & Supermarkets"),
    ("trader joe", "Trader Joe's", "Food & Dining", "Groceries & Supermarkets"),
    ("kroger", "Kroger", "Food & Dining", "Groceries & Supermarkets"),
    ("costco", "Costco", "Food & Dining", "Groceries & Supermarkets"),
    ("target", "Target", "Shopping", "General Retail"),
    ("dmart", "DMart", "Food & Dining", "Groceries & Supermarkets"),
    ("d-mart", "DMart", "Food & Dining", "Groceries & Supermarkets"),
    ("bigbasket", "BigBasket", "Food & Dining", "Groceries & Supermarkets"),
    ("blinkit", "Blinkit", "Food & Dining", "Groceries & Supermarkets"),
    ("zepto", "Zepto", "Food & Dining", "Groceries & Supermarkets"),
    ("reliance fresh", "Reliance Fresh", "Food & Dining", "Groceries & Supermarkets"),
    ("nature's basket", "Nature's Basket", "Food & Dining", "Groceries & Supermarkets"),

    # Transport
    ("uber", "Uber", "Transport", "Rideshare & Taxi"),
    ("lyft", "Lyft", "Transport", "Rideshare & Taxi"),
    ("ola", "Ola Cabs", "Transport", "Rideshare & Taxi"),
    ("rapido", "Rapido", "Transport", "Rideshare & Taxi"),
    ("delta air", "Delta Air Lines", "Transport", "Airlines & Flights"),
    ("united air", "United Airlines", "Transport", "Airlines & Flights"),
    ("american air", "American Airlines", "Transport", "Airlines & Flights"),
    ("emirates", "Emirates", "Transport", "Airlines & Flights"),
    ("indigo", "IndiGo", "Transport", "Airlines & Flights"),
    ("air india", "Air India", "Transport", "Airlines & Flights"),
    ("irctc", "IRCTC", "Transport", "Public Transit"),
    ("shell", "Shell", "Transport", "Fuel & Gas"),
    ("bpcl", "BPCL", "Transport", "Fuel & Gas"),
    ("hpcl", "HPCL", "Transport", "Fuel & Gas"),
    ("indian oil", "Indian Oil", "Transport", "Fuel & Gas"),
    ("ioc", "Indian Oil", "Transport", "Fuel & Gas"),
    ("chevron", "Chevron", "Transport", "Fuel & Gas"),
    ("exxon", "ExxonMobil", "Transport", "Fuel & Gas"),

    # Shopping
    ("amazon", "Amazon", "Shopping", "E-Commerce & Online"),
    ("flipkart", "Flipkart", "Shopping", "E-Commerce & Online"),
    ("myntra", "Myntra", "Shopping", "Clothing & Apparel"),
    ("zara", "Zara", "Shopping", "Clothing & Apparel"),
    ("h&m", "H&M", "Shopping", "Clothing & Apparel"),
    ("nike", "Nike", "Shopping", "Clothing & Apparel"),
    ("adidas", "Adidas", "Shopping", "Clothing & Apparel"),
    ("apple store", "Apple Store", "Shopping", "Electronics"),
    ("best buy", "Best Buy", "Shopping", "Electronics"),
    ("ikea", "IKEA", "Shopping", "General Retail"),
    ("uniqlo", "Uniqlo", "Shopping", "Clothing & Apparel"),
    ("ebay", "eBay", "Shopping", "E-Commerce & Online"),
    ("meesho", "Meesho", "Shopping", "E-Commerce & Online"),
    ("nykaa", "Nykaa", "Shopping", "E-Commerce & Online"),

    # Bills & Utilities
    ("airtel", "Airtel", "Bills", "Mobile & Internet"),
    ("jio", "Reliance Jio", "Bills", "Mobile & Internet"),
    ("at&t", "AT&T", "Bills", "Mobile & Internet"),
    ("verizon", "Verizon", "Bills", "Mobile & Internet"),
    ("t-mobile", "T-Mobile", "Bills", "Mobile & Internet"),
    ("vodafone", "Vodafone", "Bills", "Mobile & Internet"),
    ("comcast", "Comcast Xfinity", "Bills", "Mobile & Internet"),
    ("xfinity", "Comcast Xfinity", "Bills", "Mobile & Internet"),
    ("coned", "ConEdison", "Bills", "Electricity & Power"),
    ("pg&e", "PG&E", "Bills", "Electricity & Power"),
    ("bescom", "BESCOM", "Bills", "Electricity & Power"),
    ("adani power", "Adani Power", "Bills", "Electricity & Power"),
    ("tata power", "Tata Power", "Bills", "Electricity & Power"),
    ("netflix", "Netflix", "Bills", "Subscriptions"),
    ("spotify", "Spotify", "Bills", "Subscriptions"),
    ("disney", "Disney+", "Bills", "Subscriptions"),
    ("hulu", "Hulu", "Bills", "Subscriptions"),
    ("youtube", "YouTube", "Bills", "Subscriptions"),
    ("prime video", "Amazon Prime", "Bills", "Subscriptions"),

    # Healthcare
    ("cvs", "CVS Pharmacy", "Healthcare", "Pharmacies & Medicine"),
    ("walgreens", "Walgreens", "Healthcare", "Pharmacies & Medicine"),
    ("apollo pharmacy", "Apollo Pharmacy", "Healthcare", "Pharmacies & Medicine"),
    ("medplus", "MedPlus", "Healthcare", "Pharmacies & Medicine"),
    ("1mg", "Tata 1mg", "Healthcare", "Pharmacies & Medicine"),
    ("practo", "Practo", "Healthcare", "Doctor & Clinic"),
    ("unitedhealth", "UnitedHealth", "Healthcare", "Health Insurance"),
    ("cigna", "Cigna", "Healthcare", "Health Insurance"),
    ("bluecross", "BlueCross", "Healthcare", "Health Insurance"),
    ("geico", "GEICO", "Healthcare", "Health Insurance"),

    # Investments
    ("zerodha", "Zerodha", "Investments", "Stocks & Brokerage"),
    ("groww", "Groww", "Investments", "Stocks & Brokerage"),
    ("vanguard", "Vanguard", "Investments", "Mutual Funds & SIP"),
    ("fidelity", "Fidelity", "Investments", "Mutual Funds & SIP"),
    ("charles schwab", "Charles Schwab", "Investments", "Stocks & Brokerage"),
    ("robinhood", "Robinhood", "Investments", "Stocks & Brokerage"),
    ("coinbase", "Coinbase", "Investments", "Cryptocurrency"),
    ("binance", "Binance", "Investments", "Cryptocurrency"),
    ("angel one", "Angel One", "Investments", "Stocks & Brokerage"),
    ("upstox", "Upstox", "Investments", "Stocks & Brokerage")
]

# Basic training dataset for Scikit-Learn fallback
TRAINING_DATA = [
    ("Walmart Grocery Store Market Supermarket", "Food & Dining"),
    ("Whole Foods Organic Food", "Food & Dining"),
    ("McDonalds Burger King Subway Restaurant", "Food & Dining"),
    ("Uber Ride Trip Lift Taxi Lyft", "Transport"),
    ("Delta Airlines Flight Ticket Booking Travel", "Transport"),
    ("Amazon Prime Order Shopping Checkout", "Shopping"),
    ("Zara Clothing Store H&M Fashion Mall", "Shopping"),
    ("Netflix Premium Streaming Watch", "Bills"),
    ("Spotify Premium Family Music Listen", "Bills"),
    ("Goldman Sachs SIP mutual fund Vanguard Brokerage", "Investments"),
    ("Coinbase Bitcoin Crypto Buy ETF", "Investments"),
    ("TechCorp Payroll Monthly Salary Deposit", "Salary"),
    ("Apartment Rent Payment Renting Property", "Bills"),
    ("Comcast Xfinity Internet Cable Broadband", "Bills"),
    ("ConEd Electric Power Gas Grid", "Bills"),
    ("CVS Pharmacy Medicine Pill Drugs", "Healthcare"),
    ("Mortgage Home Loan Bank EMI Auto Payment", "Loan Payments"),
    ("IRS Tax Refund Income Federal Tax File", "Refunds"),
    ("Phone Bill Verizon AT&T T-Mobile Invoice", "Bills"),
    ("ATM cash withdrawal branch teller", "Cash Withdrawals"),
    ("Monthly account service charge SMS fee", "Bank Charges"),
    ("Transfer to friend peer to peer payment", "Personal Transfers")
]

class TransactionClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(lowercase=True)
        self.model = LogisticRegression(max_iter=1000)
        self._train()

    def _train(self):
        try:
            texts = [item[0] for item in TRAINING_DATA]
            labels = [item[1] for item in TRAINING_DATA]
            X = self.vectorizer.fit_transform(texts)
            self.model.fit(X, labels)
        except Exception:
            pass

    @staticmethod
    def parse_narration_details(narration: str) -> Dict[str, Any]:
        """
        Parses complex bank narration strings into structured components:
        paymentMethod, transactionType, reference, rawEntity, bankCode, remark.
        """
        clean_text = narration.strip()
        details = {
            "paymentMethod": "UNKNOWN",
            "transactionType": "unknown",
            "reference": None,
            "rawEntity": None,
            "bankCode": None,
            "vpa": None,
            "remark": None
        }

        # 1. Check for standard UPI patterns:
        # e.g. UPI/DR/496603932769/McDonald/YESB/MCDONALDSI/Paym
        # or UPI/CR/130091682221/S SATHISH/INDB/8050725200/Pay...
        upi_match = re.search(r'UPI/(DR|CR)/([^/]+)/([^/]+)/([^/]+)(?:/([^/]+))?(?:/(.*))?', clean_text, re.IGNORECASE)
        if upi_match:
            details["paymentMethod"] = "UPI"
            details["transactionType"] = "debit" if upi_match.group(1).upper() == "DR" else "credit"
            details["reference"] = upi_match.group(2).strip()
            details["rawEntity"] = upi_match.group(3).strip()
            details["bankCode"] = upi_match.group(4).strip()
            details["vpa"] = upi_match.group(5).strip() if upi_match.group(5) else None
            details["remark"] = upi_match.group(6).strip() if upi_match.group(6) else None
            return details

        # Variant UPI format: UPI-DR-ref-entity or UPI/ref/entity
        upi_var = re.search(r'UPI(?:[-/])(DR|CR)?(?:[-/])?(\d{6,16})[-/]([^/-]+)', clean_text, re.IGNORECASE)
        if upi_var:
            details["paymentMethod"] = "UPI"
            if upi_var.group(1):
                details["transactionType"] = "debit" if upi_var.group(1).upper() == "DR" else "credit"
            details["reference"] = upi_var.group(2)
            details["rawEntity"] = upi_var.group(3).strip()
            return details

        # 2. NEFT format:
        # e.g. NEFT/DR/N12345/ENTITY/BANK/remark or NEFT-CR-N12345-ENTITY
        neft_match = re.search(r'NEFT(?:[-/])(DR|CR)?(?:[-/])?([A-Z0-9]+)[-/]([^/-]+)', clean_text, re.IGNORECASE)
        if neft_match:
            details["paymentMethod"] = "NEFT"
            if neft_match.group(1):
                details["transactionType"] = "debit" if neft_match.group(1).upper() == "DR" else "credit"
            details["reference"] = neft_match.group(2)
            details["rawEntity"] = neft_match.group(3).strip()
            return details

        # 3. IMPS format:
        # e.g. IMPS/P2A/123456789/ENTITY/BANK or IMPS/123456789/ENTITY
        imps_match = re.search(r'IMPS(?:/(?:P2A|P2P))?/(\d{6,16})/([^/]+)', clean_text, re.IGNORECASE)
        if imps_match:
            details["paymentMethod"] = "IMPS"
            details["reference"] = imps_match.group(1)
            details["rawEntity"] = imps_match.group(2).strip()
            return details

        # 4. RTGS format:
        rtgs_match = re.search(r'RTGS(?:[-/])(DR|CR)?(?:[-/])?([A-Z0-9]+)[-/]([^/-]+)', clean_text, re.IGNORECASE)
        if rtgs_match:
            details["paymentMethod"] = "RTGS"
            if rtgs_match.group(1):
                details["transactionType"] = "debit" if rtgs_match.group(1).upper() == "DR" else "credit"
            details["reference"] = rtgs_match.group(2)
            details["rawEntity"] = rtgs_match.group(3).strip()
            return details

        # 5. POS / Card format:
        # e.g. POS 412345XXXXXX1234 STARBUCKS BANGALORE
        pos_match = re.search(r'POS\s+(?:(?:\d{4,6}[X*]+\d{4})\s+)?([A-Za-z0-9\s&\'\-]+)', clean_text, re.IGNORECASE)
        if pos_match:
            details["paymentMethod"] = "CARD"
            details["transactionType"] = "debit"
            details["rawEntity"] = pos_match.group(1).strip()
            return details

        # 6. ATM / Cash:
        if re.search(r'ATM\s+WDL|CASH\s+WDL|ATM\s+CASH', clean_text, re.IGNORECASE):
            details["paymentMethod"] = "ATM_CASH"
            details["transactionType"] = "debit"
            details["rawEntity"] = "ATM Cash Withdrawal"
            return details

        # 7. Check / Cheque:
        chq_match = re.search(r'(?:CHQ|CHEQUE)\s+(?:NO\s+)?(\d+)?\s*(?:PAID\s+TO|DEP\s+BY)?\s*([A-Za-z\s]+)?', clean_text, re.IGNORECASE)
        if chq_match:
            details["paymentMethod"] = "CHEQUE"
            details["reference"] = chq_match.group(1)
            if chq_match.group(2):
                details["rawEntity"] = chq_match.group(2).strip()
            return details

        # Generic fallback
        if "/DR/" in clean_text or clean_text.startswith("DR ") or " WDL " in clean_text:
            details["transactionType"] = "debit"
        elif "/CR/" in clean_text or clean_text.startswith("CR ") or " DEP " in clean_text:
            details["transactionType"] = "credit"

        return details

    @staticmethod
    def is_likely_individual_name(name: str) -> bool:
        """
        Determines whether an entity string represents a person's name rather than a merchant/company.
        """
        if not name or len(name) < 2:
            return False

        upper_name = name.strip().upper()

        # Corporate / Merchant indicators disqualify individual names
        corporate_indicators = [
            "LTD", "LIMITED", "PVT", "PRIVATE", "INC", "CORP", "CORPORATION", "CO",
            "STORE", "SHOP", "MART", "ENTERPRISE", "SERVICES", "SOLUTIONS",
            "FOOD", "HOTEL", "RESTAURANT", "CAFE", "BAKERY", "PHARMACY", "HOSPITAL",
            "CLINIC", "SUPERMARKET", "PETROL", "FUELS", "VENTURES", "HOLDINGS",
            "BANK", "FINANCE", "PAYMENTS", "PAYTM", "BHARATPE", "RAZORPAY", "PHONEPE",
            "CASHFREE", "AIRTEL", "JIO", "MCDONALD", "STARBUCKS", "SWIGGY", "ZOMATO"
        ]

        for ind in corporate_indicators:
            if re.search(rf'\b{ind}\b', upper_name):
                return False

        # If name has initials followed by surname or name (e.g. "S SATHISH", "M K SHARMA", "JOHN DOE")
        words = [w for w in upper_name.split() if w.isalpha()]
        if len(words) in (2, 3, 4):
            # Check if all words look like name parts (no digits, no strange symbols)
            return True

        # Single word with initial (e.g. "S.SATHISH" or "SATHISH S")
        if re.match(r'^[A-Z]\s+[A-Z]+$', upper_name) or re.match(r'^[A-Z]+\s+[A-Z]$', upper_name):
            return True

        return False

    def classify_rich(
        self,
        narration: str,
        amount: float = 0.0,
        transaction_type: Optional[str] = None,
        payment_method: Optional[str] = None,
        currency: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rich, deterministic and heuristic classification of bank statement transactions.
        Produces complete normalized entity, category, subcategory, confidence, and supporting evidence.
        """
        evidence: List[str] = []
        details = self.parse_narration_details(narration)

        # Merge inferred details with caller-provided fields
        eff_type = transaction_type or details["transactionType"]
        if eff_type == "unknown":
            eff_type = "debit" if amount < 0 else ("credit" if amount > 0 else "debit")

        eff_method = payment_method or details["paymentMethod"]
        raw_entity = details["rawEntity"] or narration

        norm_narration = narration.lower()
        clean_raw_entity = raw_entity.strip() if raw_entity else ""

        # 1. Match Verified Merchant Catalog
        for keyword, canonical_name, cat, subcat in VERIFIED_MERCHANTS:
            # Check in raw_entity or complete narration
            if keyword in clean_raw_entity.lower() or keyword in norm_narration:
                evidence.append(f"Matched verified merchant '{canonical_name}' on keyword '{keyword}'")
                if eff_method != "UNKNOWN":
                    evidence.append(f"Payment method: {eff_method}")
                evidence.append(f"Transaction direction: {eff_type}")

                return {
                    "entityName": canonical_name,
                    "entityType": "merchant",
                    "category": cat,
                    "subcategory": subcat,
                    "paymentMethod": eff_method,
                    "transactionType": eff_type,
                    "confidence": 0.98,
                    "evidence": evidence,
                    "needsReview": False
                }

        # 2. Check Person-to-Person Individual Transfer
        # Check if raw_entity is an individual name
        if clean_raw_entity and self.is_likely_individual_name(clean_raw_entity):
            # Normalize person's name (title case, preserving initials)
            parts = clean_raw_entity.split()
            norm_parts = [p.upper() if len(p) == 1 else p.capitalize() for p in parts]
            norm_name = " ".join(norm_parts)

            evidence.append(f"Identified probable individual beneficiary: {norm_name}")
            if eff_method in ("UPI", "IMPS", "NEFT", "RTGS"):
                evidence.append(f"P2P rail: {eff_method}")
            evidence.append("No corporate identifiers or merchant signals detected")

            return {
                "entityName": norm_name,
                "entityType": "individual",
                "category": "Personal Transfers",
                "subcategory": "Person-to-Person Transfer",
                "paymentMethod": eff_method,
                "transactionType": eff_type,
                "confidence": 0.94,
                "evidence": evidence,
                "needsReview": False
            }

        # 3. ATM / Cash Withdrawal
        if eff_method == "ATM_CASH" or "atm wdl" in norm_narration or "cash wdl" in norm_narration:
            evidence.append("ATM or branch cash withdrawal indicator detected")
            return {
                "entityName": "Cash Withdrawal",
                "entityType": "financial_institution",
                "category": "Cash Withdrawals",
                "subcategory": "ATM Withdrawal",
                "paymentMethod": "ATM_CASH",
                "transactionType": "debit",
                "confidence": 0.99,
                "evidence": evidence,
                "needsReview": False
            }

        # 4. Bank Charges & Fees
        if any(w in norm_narration for w in ["chrg", "charge", "fee", "sms alert", "maint", "annual fee", "penalty", "gst on"]):
            evidence.append("Bank fee or account service charge pattern matched")
            return {
                "entityName": "Bank Charges",
                "entityType": "financial_institution",
                "category": "Bank Charges",
                "subcategory": "Account Maintenance",
                "paymentMethod": eff_method,
                "transactionType": "debit",
                "confidence": 0.95,
                "evidence": evidence,
                "needsReview": False
            }

        # 5. Salary / Payroll
        if any(w in norm_narration for w in ["salary", "payroll", "direct dep", "sal cr"]):
            evidence.append("Salary or payroll indicator detected")
            return {
                "entityName": clean_raw_entity or "Employer Payroll",
                "entityType": "organization",
                "category": "Salary",
                "subcategory": "Payroll",
                "paymentMethod": eff_method if eff_method != "UNKNOWN" else "TRANSFER",
                "transactionType": "credit",
                "confidence": 0.95,
                "evidence": evidence,
                "needsReview": False
            }

        # 6. Loan / EMI / Mortgage
        if any(w in norm_narration for w in ["emi", "loan payoff", "mortgage", "loan rep"]):
            evidence.append("Loan or EMI payment pattern matched")
            return {
                "entityName": clean_raw_entity or "Loan Provider",
                "entityType": "financial_institution",
                "category": "Loan Payments",
                "subcategory": "Personal Loan EMI",
                "paymentMethod": eff_method,
                "transactionType": "debit",
                "confidence": 0.92,
                "evidence": evidence,
                "needsReview": False
            }

        # 7. Tax Payments / Refunds
        if any(w in norm_narration for w in ["tax refund", "irs refund", "it refund"]):
            evidence.append("Tax refund pattern detected")
            return {
                "entityName": "Tax Department",
                "entityType": "government",
                "category": "Refunds",
                "subcategory": "Tax Refund",
                "paymentMethod": eff_method,
                "transactionType": "credit",
                "confidence": 0.95,
                "evidence": evidence,
                "needsReview": False
            }
        elif any(w in norm_narration for w in ["tax", "irs", "incometax", "tds"]):
            evidence.append("Tax debit pattern detected")
            return {
                "entityName": "Tax Department",
                "entityType": "government",
                "category": "Bills",
                "subcategory": "Gas Utility",
                "paymentMethod": eff_method,
                "transactionType": "debit",
                "confidence": 0.90,
                "evidence": evidence,
                "needsReview": False
            }

        # 8. Refunds & Reversals
        if any(w in norm_narration for w in ["refund", "reversal", "rev:", "cashback"]):
            evidence.append("Transaction reversal or merchant refund detected")
            return {
                "entityName": clean_raw_entity or "Refund Processing",
                "entityType": "merchant",
                "category": "Refunds",
                "subcategory": "Merchant Refund",
                "paymentMethod": eff_method,
                "transactionType": "credit",
                "confidence": 0.90,
                "evidence": evidence,
                "needsReview": False
            }

        # 9. Scikit-Learn TF-IDF Fallback
        try:
            X_test = self.vectorizer.transform([narration])
            prediction = self.model.predict(X_test)[0]
            probabilities = self.model.predict_proba(X_test)[0]
            max_prob = max(probabilities)

            if max_prob > 0.40:
                evidence.append(f"ML Classifier prediction with probability {max_prob:.2f}")
                subcat = CATEGORY_HIERARCHY.get(prediction, ["General"])[0]
                return {
                    "entityName": clean_raw_entity or narration.split()[0],
                    "entityType": "merchant",
                    "category": prediction,
                    "subcategory": subcat,
                    "paymentMethod": eff_method,
                    "transactionType": eff_type,
                    "confidence": round(float(max_prob), 2),
                    "evidence": evidence,
                    "needsReview": max_prob < 0.65
                }
        except Exception:
            pass

        # 10. Default / Uncategorized (Requires Review)
        evidence.append("Insufficient identifiable patterns to categorize with certainty")
        return {
            "entityName": clean_raw_entity or narration.split()[0] if narration else "Unknown Entity",
            "entityType": "unknown",
            "category": "Uncategorized",
            "subcategory": "Needs Review",
            "paymentMethod": eff_method,
            "transactionType": eff_type,
            "confidence": 0.30,
            "evidence": evidence,
            "needsReview": True
        }

    def classify(self, description: str, amount: float = 0.0) -> str:
        """
        Legacy compatibility method returning upper-case Category enum string
        """
        rich = self.classify_rich(description, amount)
        cat = rich["category"]

        # Map to legacy Prisma enum strings:
        mapping = {
            "Food & Dining": "FOOD",
            "Transport": "TRAVEL",
            "Shopping": "SHOPPING",
            "Bills": "BILLS",
            "Healthcare": "HEALTHCARE",
            "Salary": "SALARY",
            "Personal Transfers": "OTHERS",
            "Cash Withdrawals": "OTHERS",
            "Bank Charges": "OTHERS",
            "Loan Payments": "EMI",
            "Investments": "INVESTMENT",
            "Refunds": "OTHERS",
            "Uncategorized": "OTHERS"
        }
        return mapping.get(cat, "OTHERS")

# Singleton instance
classifier_instance = TransactionClassifier()
