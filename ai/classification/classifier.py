import re
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Built-in robust categories
CATEGORIES = [
    "FOOD", "SHOPPING", "TRAVEL", "BILLS", "UTILITIES",
    "HEALTHCARE", "INSURANCE", "ENTERTAINMENT", "EDUCATION",
    "INVESTMENT", "SALARY", "RENT", "EMI", "TAX", "OTHERS"
]

# Simple training dataset for the Scikit-Learn TF-IDF classifier
TRAINING_DATA = [
    ("Walmart Grocery Store Market Supermarket", "FOOD"),
    ("Whole Foods Organic Food", "FOOD"),
    ("McDonalds Burger King Subway Restaurant", "FOOD"),
    ("Uber Ride Trip Lift Taxi Lyft", "TRAVEL"),
    ("Delta Airlines Flight Ticket Booking Travel", "TRAVEL"),
    ("Amazon Prime Order Shopping Checkout", "SHOPPING"),
    ("Zara Clothing Store H&M Fashion Mall", "SHOPPING"),
    ("Netflix Premium Streaming Watch", "ENTERTAINMENT"),
    ("Spotify Premium Family Music Listen", "ENTERTAINMENT"),
    ("Goldman Sachs SIP mutual fund Vanguard Brokerage", "INVESTMENT"),
    ("Coinbase Bitcoin Crypto Buy ETF", "INVESTMENT"),
    ("TechCorp Payroll Monthly Salary Deposit", "SALARY"),
    ("Apartment Rent Payment Renting Property", "RENT"),
    ("Comcast Xfinity Internet Cable Broadband", "UTILITIES"),
    ("ConEd Electric Power Gas Grid", "UTILITIES"),
    ("StateFarm Car Auto Renters Insurance Premium", "INSURANCE"),
    ("Humana BlueCross Premium Doctor Health Checkup", "HEALTHCARE"),
    ("CVS Pharmacy Medicine Pill Drugs", "HEALTHCARE"),
    ("Coursera Course Subscription Udemy Class", "EDUCATION"),
    ("Mortgage Home Loan Bank EMI Auto Payment", "EMI"),
    ("IRS Tax Refund Income Federal Tax File", "TAX"),
    ("Phone Bill Verizon AT&T T-Mobile Invoice", "BILLS"),
]

class TransactionClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(lowercase=True)
        self.model = LogisticRegression(max_iter=1000)
        self._train()

    def _train(self):
        texts = [item[0] for item in TRAINING_DATA]
        labels = [item[1] for item in TRAINING_DATA]
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)

    def classify(self, description: str, amount: float = 0.0) -> str:
        desc_lower = description.lower()

        # Immediate High-Confidence Keyword Heuristics
        if "salary" in desc_lower or "payroll" in desc_lower or "direct dep" in desc_lower:
            return "SALARY"
        if "rent" in desc_lower or "landlord" in desc_lower or "apartment" in desc_lower:
            return "RENT"
        if "emi" in desc_lower or "loan payoff" in desc_lower or "mortgage" in desc_lower:
            return "EMI"
        if "tax" in desc_lower or "irs" in desc_lower or "revenue" in desc_lower:
            return "TAX"
        if "insurance" in desc_lower or "geico" in desc_lower or "state farm" in desc_lower or "progressive" in desc_lower:
            return "INSURANCE"
        if "vanguard" in desc_lower or "fidelity" in desc_lower or "investment" in desc_lower or "etf" in desc_lower or "stocks" in desc_lower:
            return "INVESTMENT"
        if "netflix" in desc_lower or "spotify" in desc_lower or "disney" in desc_lower or "hulu" in desc_lower or "steam" in desc_lower or "cinema" in desc_lower:
            return "ENTERTAINMENT"
        if "uber" in desc_lower or "lyft" in desc_lower or "airline" in desc_lower or "flight" in desc_lower or "transit" in desc_lower or "subway" in desc_lower:
            return "TRAVEL"
        if "whole foods" in desc_lower or "walmart" in desc_lower or "market" in desc_lower or "grocery" in desc_lower or "restaurant" in desc_lower or "starbucks" in desc_lower or "mcdonald" in desc_lower:
            return "FOOD"

        # Machine Learning Inference fallback
        try:
            X_test = self.vectorizer.transform([description])
            prediction = self.model.predict(X_test)[0]
            # Verify if prediction has reasonable confidence
            probabilities = self.model.predict_proba(X_test)[0]
            max_prob = max(probabilities)
            if max_prob > 0.15:
                return prediction
        except Exception:
            pass

        return "OTHERS"

# Singleton instance
classifier_instance = TransactionClassifier()
