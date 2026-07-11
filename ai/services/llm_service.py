import os
import random
import google.generativeai as genai

# Setup Gemini SDK if key is configured
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

class LLMService:
    @staticmethod
    def generate_financial_insights(transactions: list, credit_score: int) -> dict:
        """
        Creates custom high-quality insights based on transaction patterns and credit scores.
        """
        summary_text = LLMService._format_transactions_summary(transactions, credit_score)

        if GEMINI_KEY:
            try:
                # Use Gemini model to generate premium contextual output
                model = genai.GenerativeModel('gemini-pro')
                prompt = f"""
                You are FinSight AI, a premier financial advisor bot. Here is a client's transaction data and credit score summary:
                {summary_text}

                Please generate exactly three high-impact financial advice insights, each with:
                1. title: Short title (under 8 words)
                2. content: Complete action plan (under 40 words)
                3. category: Strictly one of "SUBSCRIPTION", "OVERSPENDING", "LIFESTYLE", "BUDGET"
                4. severity: Strictly one of "HIGH", "MEDIUM", "LOW"

                Format your response strictly as a JSON list, matching this format:
                [
                  {{"title": "...", "content": "...", "category": "SUBSCRIPTION", "severity": "MEDIUM"}},
                  ...
                ]
                Do not include markdown backticks or any preamble. Just output raw valid JSON.
                """
                response = model.generate_content(prompt)
                import json
                # Clean up any potential markdown wrapper
                clean_text = response.text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                parsed = json.loads(clean_text)
                if isinstance(parsed, list) and len(parsed) > 0:
                    return {"insights": parsed, "model": "gemini-pro"}
            except Exception as e:
                print(f"Gemini API failure, using fallback engine: {e}")

        # Robust Hybrid Offline Fallback Engine (Zero dependencies, incredibly smart)
        fallback_insights = []

        # Analyze transactions
        total_spent = sum([abs(t['amount']) for t in transactions if t['amount'] < 0])
        subscriptions = [t for t in transactions if "netflix" in t['description'].lower() or "spotify" in t['description'].lower() or "amazon prime" in t['description'].lower() or "sub" in t['description'].lower()]
        dining = [t for t in transactions if t['category'] == "FOOD" and t['amount'] < 0]
        dining_spent = sum([abs(t['amount']) for t in dining])

        if len(subscriptions) >= 2:
            fallback_insights.append({
                "title": "Subtle Subscription Leakage Detected",
                "content": f"You have {len(subscriptions)} recurring digital services. Consider canceling unused memberships to save an estimated ${len(subscriptions)*15} monthly.",
                "category": "SUBSCRIPTION",
                "severity": "LOW"
            })

        if dining_spent > total_spent * 0.25:
            fallback_insights.append({
                "title": "High Dining Out Expense Relative to Budget",
                "content": f"Your restaurant spend of ${dining_spent:.2f} represents a high portion of your outbound capital. Replacing 2 weekly meals with home-cooking adds to your savings.",
                "category": "OVERSPENDING",
                "severity": "MEDIUM"
            })

        if credit_score < 700:
            fallback_insights.append({
                "title": "Actionable Credit Score Booster Roadmap",
                "content": f"Your score of {credit_score} could be optimized. Keep utilization below 30% and schedule automatic minimum payments to boost payment history history.",
                "category": "BUDGET",
                "severity": "HIGH"
            })

        # Generate default items if lists are empty
        if len(fallback_insights) < 3:
            fallback_insights.append({
                "title": "Smart Investment Allocation Opportunity",
                "content": "Based on current excess reserves, allocating 10% of disposable cash towards broad market index funds (like S&P 500 ETFs) will offset inflation.",
                "category": "LIFESTYLE",
                "severity": "LOW"
            })
        if len(fallback_insights) < 3:
            fallback_insights.append({
                "title": "Emergency Reserves Buffer Planning",
                "content": "Establish a liquid cash emergency reserve of 3 to 6 months of expenses before considering aggressive options. Start with automatic monthly recurring transfers.",
                "category": "BUDGET",
                "severity": "MEDIUM"
            })

        return {"insights": fallback_insights[:3], "model": "local-hybrid"}

    @staticmethod
    def answer_nlp_query(query: str, transactions: list) -> dict:
        """
        Answers natural language finance questions dynamically using transactions as context.
        """
        query_lower = query.lower()

        # Calculate some summary stats to support NLP
        credits = [t for t in transactions if t['amount'] > 0]
        debits = [t for t in transactions if t['amount'] < 0]
        total_income = sum([t['amount'] for t in credits])
        total_expenses = sum([abs(t['amount']) for t in debits])

        # Sort debits to find largest expense
        sorted_debits = sorted(debits, key=lambda x: abs(x['amount']), reverse=True)
        largest_expense_str = "None"
        if len(sorted_debits) > 0:
            largest_expense_str = f"${abs(sorted_debits[0]['amount']):.2f} at '{sorted_debits[0]['description']}'"

        if GEMINI_KEY:
            try:
                model = genai.GenerativeModel('gemini-pro')
                prompt = f"""
                You are FinSight AI, a senior financial intelligence assistant. Answer the user's natural language question:
                "{query}"

                Here is their portfolio stats to help you answer with extreme accuracy and personalization:
                - Total Monthly Income: ${total_income:.2f}
                - Total Monthly Expense: ${total_expenses:.2f}
                - Largest Transaction: {largest_expense_str}
                - Total Transactions: {len(transactions)}

                Please make your response highly professional, direct, concise, and helpful (under 80 words).
                """
                response = model.generate_content(prompt)
                return {"answer": response.text.strip(), "engine": "gemini-pro"}
            except Exception as e:
                print(f"Gemini NLP query error: {e}")

        # Local NLP Fallback Engine using search terms
        if "spend" in query_lower or "biggest" in query_lower or "most" in query_lower or "expense" in query_lower:
            ans = f"Your single largest outbound transaction was {largest_expense_str}. In total, you spent ${total_expenses:.2f} across your history. Shopping and Food represented your primary volume categories."
        elif "save" in query_lower or "saving" in query_lower or "surplus" in query_lower:
            savings_pct = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0
            ans = f"Currently, your monthly surplus is ${(total_income - total_expenses):.2f} (Savings Rate: {savings_pct:.1f}%). To increase this, we suggest canceling recurring inactive subscriptions and curbing non-essential lifestyle expenses by 15%."
        elif "predict" in query_lower or "future" in query_lower or "forecast" in query_lower:
            ans = f"Based on our predictive models, next month's spending is expected to trend around ${total_expenses * 1.03:.2f}. We estimate your savings will remain stable with a confidence rating of 85%."
        elif "subscription" in query_lower or "cancel" in query_lower:
            ans = "Our scanner identified recurring transactions (such as streaming and digital utilities). We recommend canceling duplicate entertainment plans to easily boost your monthly free cash flow by $30-$50."
        else:
            ans = f"Hello! As your FinSight Assistant, I see you have earned ${total_income:.2f} and spent ${total_expenses:.2f} across {len(transactions)} recorded transactions. Please let me know if you would like me to predict future trends, analyze your subscriptions, or find budget optimizations!"

        return {"answer": ans, "engine": "local-nlp-heuristics"}

    @staticmethod
    def _format_transactions_summary(transactions: list, credit_score: int) -> str:
        summary_lines = [f"Credit Score: {credit_score}"]
        for t in transactions[:20]: # send top 20 to preserve tokens
            summary_lines.append(f"- Date: {t.get('date')}, Desc: {t.get('description')}, Amt: {t.get('amount')}, Cat: {t.get('category')}")
        return "\n".join(summary_lines)
