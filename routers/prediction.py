"""
Prediction Router — FastAPI endpoint for the Prediction Agent.

POST /api/predict/chat
- Accepts conversation history + latest user message
- Returns structured JSON with status, message, and prediction data
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Ensure the agents package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.prediction_agent import run_prediction_agent
from supabase_client import supabase_admin

router = APIRouter(prefix="/api/predict", tags=["Prediction"])


# ─────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────
class ShapFactor(BaseModel):
    stage: str
    days: float
    title: str
    detailed_cause: str


class PredictionData(BaseModel):
    delay_days: Optional[float] = None
    shap_causes: list[dict] = []        # raw dicts — schema varies per run
    detailed_analysis: Optional[str] = None
    document_warning: Optional[str] = None
    env_scores: Optional[dict] = None
    variables: Optional[dict] = None


class ChatMessage(BaseModel):
    role: str  # "user" | "ai" | "admin"
    content: str


class PredictionRequest(BaseModel):
    conversation_history: list[ChatMessage] = []
    message: str  # The latest user message
    current_prediction: Optional[PredictionData] = None


class PredictionResponse(BaseModel):
    status: str  # "waiting_for_info" | "success"
    message: str
    prediction_data: Optional[PredictionData] = None


# ─────────────────────────────────────────────
# POST /api/predict/chat
# ─────────────────────────────────────────────
@router.post("/chat", response_model=PredictionResponse)
async def predict_chat(request: PredictionRequest):
    """
    Conversational prediction endpoint.
    
    The agent maintains context via the conversation_history array.
    If information is missing, it returns status="waiting_for_info" with a follow-up question.
    If all variables are gathered, it runs the ML model and returns the prediction.
    """
    try:
        # Convert Pydantic models to dicts for the agent
        history = [msg.model_dump() for msg in request.conversation_history]
        
        # Initialize variables before running
        current_prediction_dict = request.current_prediction.model_dump() if request.current_prediction else None
        prediction_data_to_save = None
        
        # Run the prediction agent (LangGraph state machine)
        result = await run_prediction_agent(history, request.message, current_prediction=current_prediction_dict)
        
        # After the graph finishes, safely extract the prediction data
        state = result
        prediction_data_to_save = state.get("final_prediction") if "final_prediction" in state else (state.get("prediction_data") if state and "prediction_data" in state else None)
        
        # Format the response
        prediction_data = None
        if prediction_data_to_save:
            prediction_data = PredictionData(
                delay_days=prediction_data_to_save.get("delay_days"),
                shap_causes=prediction_data_to_save.get("shap_causes", []),
                detailed_analysis=prediction_data_to_save.get("detailed_analysis"),
                document_warning=prediction_data_to_save.get("document_warning"),
                env_scores=prediction_data_to_save.get("env_scores"),
                variables=prediction_data_to_save.get("variables")
            )
        
        # Log to Supabase prediction_history table
        try:
            supabase_admin.table("prediction_history").insert({
                "user_message": request.message,
                "agent_response": result["message"],
                "prediction_data": prediction_data_to_save
            }).execute()
        except Exception as log_e:
            print(f"⚠️ Supabase logging failed: {log_e}")

        return PredictionResponse(
            status=result["status"],
            message=result["message"],
            prediction_data=prediction_data
        )
        
    except Exception as e:
        print(f"❌ Prediction endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# GET /api/predict/history
# ─────────────────────────────────────────────
@router.get("/history")
async def get_prediction_history_route():
    """
    Fetches the recent prediction history.
    Queries prediction_history table, selects id, created_at, user_message, agent_response, prediction_data.
    Orders by created_at descending, limits to 20, and returns the data.
    """
    try:
        response = (
            supabase_admin.table("prediction_history")
            .select("id, created_at, user_message, agent_response, prediction_data")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception as e:
        print(f"❌ History fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
