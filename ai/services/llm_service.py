import os
import json
import re
import requests
from typing import List, Dict, Any, Optional

from classification.classifier import classifier_instance, CATEGORY_HIERARCHY

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_KEY}"

def sanitize_for_ai(text: str) -> str:
    """
    Masks sensitive financial data (card numbers, full bank account numbers) before AI dispatch.
    """
    # Mask 12-19 digit card/account numbers leaving only last 4
    masked = re.sub(r'\b(?:\d[ -]*?){12,19}\b', lambda m: 'X' * (len(m.group(0)) - 4) + m.group(0)[-4:], text)
    return masked

class LLMService:
    @staticmethod
    def _call_gemini_raw(prompt: str, timeout: int = 10) -> Optional[str]:
        if not GEMINI_KEY:
            return None
        try:
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "topK": 1,
                    "maxOutputTokens": 2048
                }
            }
            resp = requests.post(GEMINI_URL, json=payload, timeout=timeout)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                    return candidates[0]["content"]["parts"][0].get("text", "").strip()
            else:
                print(f"Gemini API returned status {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            print(f"Gemini API HTTP request error: {e}")
        return None

    @staticmethod
    def batch_classify_transactions(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Batches ambiguous or candidate transactions to Gemini AI with strict JSON validation.
        Falls back seamlessly to local deterministic classifier.
        """
        results = []
        ambiguous_items = []

        # First pass: deterministic classification with high confidence
        for tx in transactions:
            narration = tx.get("narration") or tx.get("description", "")
            amount = tx.get("amount", 0.0)
            tx_type = tx.get("transactionType")
            method = tx.get("paymentMethod")
            currency = tx.get("currency")
            tx_id = tx.get("id") or str(len(results))

            local_result = classifier_instance.classify_rich(
                narration=narration,
                amount=amount,
                transaction_type=tx_type,
                payment_method=method,
                currency=currency
            )

            # If confidence is already high (> 0.90), accept it immediately
            if local_result["confidence"] >= 0.90:
                results.append({
                    "id": tx_id,
                    "entityName": local_result["entityName"],
                    "entityType": local_result["entityType"],
                    "category": local_result["category"],
                    "subcategory": local_result["subcategory"],
                    "paymentMethod": local_result["paymentMethod"],
                    "transactionType": local_result["transactionType"],
                    "confidence": local_result["confidence"],
                    "evidence": local_result["evidence"],
                    "needsReview": local_result["needsReview"]
                })
            else:
                ambiguous_items.append((tx_id, tx, local_result))

        # If no items need LLM or no API key, resolve remaining with local results
        if not ambiguous_items or not GEMINI_KEY:
            for tx_id, tx, local_result in ambiguous_items:
                results.append({
                    "id": tx_id,
                    "entityName": local_result["entityName"],
                    "entityType": local_result["entityType"],
                    "category": local_result["category"],
                    "subcategory": local_result["subcategory"],
                    "paymentMethod": local_result["paymentMethod"],
                    "transactionType": local_result["transactionType"],
                    "confidence": local_result["confidence"],
                    "evidence": local_result["evidence"],
                    "needsReview": local_result["needsReview"]
                })
            return results

        # Process ambiguous items via Gemini in batch
        prompt_items = []
        for tx_id, tx, local in ambiguous_items:
            sanitized_desc = sanitize_for_ai(tx.get("narration") or tx.get("description", ""))
            prompt_items.append({
                "id": tx_id,
                "narration": sanitized_desc,
                "amount": tx.get("amount"),
                "transactionType": tx.get("transactionType", "unknown"),
                "paymentMethod": tx.get("paymentMethod", "unknown"),
                "currency": tx.get("currency", "UNKNOWN")
            })

        prompt = f"""
You are FinSight AI's bank transaction classification expert.
Classify each bank statement transaction strictly based on available evidence in the narration and fields.

Allowed Categories and Subcategories:
{json.dumps(CATEGORY_HIERARCHY, indent=2)}

Rules:
1. Distinguish merchants from individuals:
   - If the entity is a business/brand/store, entityType must be "merchant".
   - If the entity is a person (e.g., peer transfer, person name), entityType must be "individual" and category must be "Personal Transfers" -> "Person-to-Person Transfer". Do not classify individuals as Food & Dining or Shopping.
   - Never infer purpose solely from a person's name or transaction amount.
2. If evidence is ambiguous, set needsReview=true and assign category="Uncategorized", subcategory="Needs Review".
3. Return supporting evidence as a list of short strings.
4. Output strictly valid JSON matching this schema:
[
  {{
    "id": "item_id",
    "entityName": "Normalized Clean Name",
    "entityType": "merchant" | "individual" | "financial_institution" | "organization" | "unknown",
    "category": "One of the allowed categories",
    "subcategory": "One of the allowed subcategories",
    "confidence": 0.0 to 1.0,
    "evidence": ["reason 1", "reason 2"],
    "needsReview": true | false
  }}
]
No preamble, markdown backticks, or extra explanation. Only the JSON array.

Transactions to classify:
{json.dumps(prompt_items, indent=2)}
"""

        ai_response = LLMService._call_gemini_raw(prompt, timeout=12)
        llm_map: Dict[str, Dict[str, Any]] = {}

        if ai_response:
            try:
                clean_text = ai_response.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                elif clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                parsed = json.loads(clean_text)
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict) and "id" in item:
                            llm_map[str(item["id"])] = item
            except Exception as e:
                print(f"Failed to parse Gemini batch classification JSON: {e}")

        # Assemble final results with fallback
        for tx_id, tx, local_res in ambiguous_items:
            if tx_id in llm_map:
                item = llm_map[tx_id]
                # Validate category
                cat = item.get("category", local_res["category"])
                if cat not in CATEGORY_HIERARCHY:
                    cat = local_res["category"]

                results.append({
                    "id": tx_id,
                    "entityName": item.get("entityName") or local_res["entityName"],
                    "entityType": item.get("entityType") or local_res["entityType"],
                    "category": cat,
                    "subcategory": item.get("subcategory") or local_res["subcategory"],
                    "paymentMethod": tx.get("paymentMethod") or local_res["paymentMethod"],
                    "transactionType": tx.get("transactionType") or local_res["transactionType"],
                    "confidence": float(item.get("confidence", 0.85)),
                    "evidence": item.get("evidence") or ["AI classification via Gemini"],
                    "needsReview": bool(item.get("needsReview", False))
                })
            else:
                results.append({
                    "id": tx_id,
                    "entityName": local_res["entityName"],
                    "entityType": local_res["entityType"],
                    "category": local_res["category"],
                    "subcategory": local_res["subcategory"],
                    "paymentMethod": local_res["paymentMethod"],
                    "transactionType": local_res["transactionType"],
                    "confidence": local_res["confidence"],
                    "evidence": local_res["evidence"],
                    "needsReview": local_res["needsReview"]
                })

        return results

    @staticmethod
    def generate_financial_insights(transactions: list, credit_score: int) -> dict:
        summary_text = LLMService._format_transactions_summary(transactions, credit_score)

        if GEMINI_KEY:
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
              {{"title": "...", "content": "...", "category": "SUBSCRIPTION", "severity": "MEDIUM"}}
            ]
            Do not include markdown backticks or any preamble. Just output raw valid JSON.
            """
            raw = LLMService._call_gemini_raw(prompt)
            if raw:
                try:
                    clean_text = raw.strip()
                    if clean_text.startswith("```json"):
                        clean_text = clean_text[7:]
                    if clean_text.endswith("```"):
                        clean_text = clean_text[:-3]
                    parsed = json.loads(clean_text.strip())
                    if isinstance(parsed, list) and len(parsed) > 0:
                        return {"insights": parsed, "model": "gemini-1.5-flash"}
                except Exception as e:
                    print(f"Gemini insight parse failure: {e}")

        # Local Offline Fallback Engine
        fallback_insights = []
        total_spent = sum([abs(t['amount']) for t in transactions if t.get('amount', 0) < 0])
        subscriptions = [t for t in transactions if any(k in t.get('description', '').lower() for k in ["netflix", "spotify", "prime", "sub"])]
        dining = [t for t in transactions if t.get('category') in ("FOOD", "Food & Dining") and t.get('amount', 0) < 0]
        dining_spent = sum([abs(t['amount']) for t in dining])

        if len(subscriptions) >= 2:
            fallback_insights.append({
                "title": "Subscription Audit Recommended",
                "content": f"Identified {len(subscriptions)} recurring digital services. Consider auditing unused accounts to optimize monthly expenses.",
                "category": "SUBSCRIPTION",
                "severity": "LOW"
            })

        if dining_spent > total_spent * 0.25 and total_spent > 0:
            fallback_insights.append({
                "title": "Dining Out Optimization",
                "content": f"Dining expenses represent a significant proportion of total expenditure. Reducing restaurant dining can boost savings.",
                "category": "OVERSPENDING",
                "severity": "MEDIUM"
            })

        if credit_score < 700:
            fallback_insights.append({
                "title": "Credit Score Optimization",
                "content": f"Current credit score is {credit_score}. Keeping utilization below 30% and paying on time will strengthen credit history.",
                "category": "BUDGET",
                "severity": "HIGH"
            })

        if len(fallback_insights) < 3:
            fallback_insights.append({
                "title": "Emergency Fund Buffer",
                "content": "Establish a 3 to 6-month living expense reserve in high-yield liquid savings before aggressive equity allocations.",
                "category": "BUDGET",
                "severity": "MEDIUM"
            })

        return {"insights": fallback_insights[:3], "model": "local-hybrid"}

    @staticmethod
    def answer_nlp_query(query: str, transactions: list) -> dict:
        query_lower = query.lower()
        credits = [t for t in transactions if t.get('amount', 0) > 0]
        debits = [t for t in transactions if t.get('amount', 0) < 0]
        total_income = sum([t['amount'] for t in credits])
        total_expenses = sum([abs(t['amount']) for t in debits])

        sorted_debits = sorted(debits, key=lambda x: abs(x.get('amount', 0)), reverse=True)
        largest_expense_str = "None"
        if len(sorted_debits) > 0:
            largest_expense_str = f"${abs(sorted_debits[0]['amount']):.2f} at '{sorted_debits[0].get('description')}'"

        if GEMINI_KEY:
            prompt = f"""
            You are FinSight AI, a senior financial intelligence assistant. Answer the user's question:
            "{query}"

            Client Stats:
            - Monthly Income: ${total_income:.2f}
            - Monthly Expense: ${total_expenses:.2f}
            - Largest Transaction: {largest_expense_str}
            - Total Transactions: {len(transactions)}

            Keep the response under 80 words, professional, direct, and actionable.
            """
            raw = LLMService._call_gemini_raw(prompt)
            if raw:
                return {"answer": raw.strip(), "engine": "gemini-1.5-flash"}

        # Heuristic NLP fallback
        if any(w in query_lower for w in ["spend", "biggest", "most", "expense"]):
            ans = f"Your largest transaction was {largest_expense_str}. Total outbound spending is ${total_expenses:.2f} across your recorded transactions."
        elif any(w in query_lower for w in ["save", "saving", "surplus"]):
            surplus = total_income - total_expenses
            pct = (surplus / total_income * 100) if total_income > 0 else 0
            ans = f"Your current surplus is ${surplus:.2f} (Savings Rate: {pct:.1f}%). Focus on curbing recurring subscriptions to increase margin."
        else:
            ans = f"FinSight AI records total income of ${total_income:.2f} and expenses of ${total_expenses:.2f} across {len(transactions)} transactions."

        return {"answer": ans, "engine": "local-nlp-heuristics"}

    @staticmethod
    def _format_transactions_summary(transactions: list, credit_score: int) -> str:
        summary_lines = [f"Credit Score: {credit_score}"]
        for t in transactions[:20]:
            summary_lines.append(f"- Date: {t.get('date')}, Desc: {t.get('description')}, Amt: {t.get('amount')}, Cat: {t.get('category')}")
        return "\n".join(summary_lines)
