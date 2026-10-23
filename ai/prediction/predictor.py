import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression

class FinancialPredictor:
    @staticmethod
    def predict_spending(transactions_data: list) -> dict:
        """
        Receives a list of transaction objects:
        [{"date": "2025-01-01", "amount": -10.5, "category": "FOOD", "description": "..."}]
        Computes financial predictions, confidence score, and insights.
        """
        if not transactions_data:
            return {
                "predicted_expense": 0.0,
                "predicted_savings": 0.0,
                "confidence_score": 0.0,
                "budget_risk": "LOW",
                "risk_explanation": "No transaction history available yet. Upload a statement to activate ML predictions.",
                "trends": []
            }

        df = pd.DataFrame(transactions_data)
        df['date'] = pd.to_datetime(df['date'])
        df['amount'] = df['amount'].astype(float)

        # Separate credits and debits. Usually debits are negative in fintech
        # Let's ensure uniform positive representation for expenses
        df['is_expense'] = df['amount'] < 0
        df['abs_amount'] = df['amount'].abs()

        expenses_df = df[df['is_expense']].copy()
        income_df = df[~df['is_expense']].copy()

        # Group expenses by year-month to find monthly aggregates
        expenses_df['year_month'] = expenses_df['date'].dt.to_period('M')
        monthly_exp = expenses_df.groupby('year_month')['abs_amount'].sum().reset_index()
        monthly_exp['month_index'] = np.arange(len(monthly_exp))

        # Perform Linear Regression on Monthly Expenses if we have multiple months
        predicted_expense = 0.0
        confidence = 0.85

        if len(monthly_exp) >= 2:
            X = monthly_exp[['month_index']]
            y = monthly_exp['abs_amount']
            model = LinearRegression()
            model.fit(X, y)

            next_month_idx = len(monthly_exp)
            predicted_expense = max(0.0, float(model.predict([[next_month_idx]])[0]))
            # Calculate standard deviation/variance to measure confidence
            std_dev = y.std()
            if std_dev > 0 and y.mean() > 0:
                coef_variation = std_dev / y.mean()
                confidence = max(0.4, min(0.95, 1.0 - (coef_variation * 0.3)))
        else:
            # Fallback to sum of expenses in the dataset
            predicted_expense = expenses_df['abs_amount'].sum() if len(expenses_df) > 0 else 0.0
            confidence = 0.50

        # Predict Income
        total_income = income_df['abs_amount'].sum() if len(income_df) > 0 else 0.0
        predicted_income = income_df['abs_amount'].mean() if len(income_df) > 0 else total_income

        # Calculate Savings
        predicted_savings = max(0.0, predicted_income - predicted_expense)

        # Budget Risk Rating
        risk_level = "LOW"
        risk_explanation = "Spending is well within income thresholds. Budget remains secure."
        if predicted_income > 0:
            if predicted_expense > predicted_income * 0.9:
                risk_level = "HIGH"
                risk_explanation = "Expenses are projected to exceed 90% of your current income. High risk of capital deficit."
            elif predicted_expense > predicted_income * 0.7:
                risk_level = "MEDIUM"
                risk_explanation = "Expenses are rising. Savings allocation is constrained below optimal safety ratios."
        elif predicted_expense > 0:
            risk_level = "MEDIUM"
            risk_explanation = "Expenses logged with no corresponding income recorded yet."

        # Compile trend history for the charts
        trends_data = []
        if len(monthly_exp) > 0:
            for _, row in monthly_exp.iterrows():
                trends_data.append({
                    "month": str(row['year_month']),
                    "amount": round(float(row['abs_amount']), 2)
                })

        # Append predicted month only if historical expenses exist
        if len(monthly_exp) > 0 and predicted_expense > 0:
            future_date = datetime.now() + timedelta(days=30)
            trends_data.append({
                "month": future_date.strftime("%Y-%m") + " (Est)",
                "amount": round(predicted_expense, 2)
            })

        return {
            "predicted_expense": round(predicted_expense, 2),
            "predicted_savings": round(predicted_savings, 2),
            "confidence_score": round(confidence, 2),
            "budget_risk": risk_level,
            "risk_explanation": risk_explanation,
            "trends": trends_data
        }
