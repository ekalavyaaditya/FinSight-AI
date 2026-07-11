import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from classification.classifier import classifier_instance
from prediction.predictor import FinancialPredictor
from services.llm_service import LLMService

app = FastAPI(
    title="FinSight AI Service",
    description="FastAPI predictive analytics and machine learning service for FinSight AI",
    version="1.0.0"
)

# Enable CORS for communication from the Node backend or Web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ClassifyRequest(BaseModel):
    description: str
    amount: Optional[float] = 0.0

class ClassifyResponse(BaseModel):
    category: str

class TransactionItem(BaseModel):
    date: str
    description: str
    amount: float
    category: str

class PredictRequest(BaseModel):
    transactions: List[TransactionItem]

class InsightsRequest(BaseModel):
    transactions: List[TransactionItem]
    creditScore: int

class ChatRequest(BaseModel):
    query: str
    transactions: List[TransactionItem]

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "FinSight AI ML Engine",
        "gemini_active": bool(os.environ.get("GEMINI_API_KEY"))
    }

@app.post("/classify", response_model=ClassifyResponse)
def classify_transaction(payload: ClassifyRequest):
    try:
        category = classifier_instance.classify(payload.description, payload.amount)
        return ClassifyResponse(category=category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
def predict_trends(payload: PredictRequest):
    try:
        # Convert list of pydantic models to dicts
        tx_dicts = [tx.model_dump() for tx in payload.transactions]
        prediction = FinancialPredictor.predict_spending(tx_dicts)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/insights")
def generate_insights(payload: InsightsRequest):
    try:
        tx_dicts = [tx.model_dump() for tx in payload.transactions]
        insights = LLMService.generate_financial_insights(tx_dicts, payload.creditScore)
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
def nlp_chat(payload: ChatRequest):
    try:
        tx_dicts = [tx.model_dump() for tx in payload.transactions]
        answer = LLMService.answer_nlp_query(payload.query, tx_dicts)
        return answer
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
