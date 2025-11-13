"""
FastAPI Service for Transformer Model - CallCenterAI
Endpoint for ticket classification using DistilBERT multilingual model
"""

import os
import json
import time
from typing import Dict, List, Optional
from datetime import datetime

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CollectorRegistry
from fastapi.responses import Response

from contextlib import asynccontextmanager

from transformers import AutoTokenizer, AutoModelForSequenceClassification
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-multilingual-cased")
model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-multilingual-cased")
tokenizer.save_pretrained("models/transformer/final_model")
model.save_pretrained("models/transformer/final_model")

# ==================== Configuration ====================
MODEL_PATH = os.getenv("MODEL_PATH", "C:/Users/rayen/Desktop/mlops/models/transformer/final_model")
LABEL_MAPPING_PATH = os.getenv("LABEL_MAPPING_PATH", "C:/Users/rayen/Desktop/mlops/models/transformer/label_mapping.json")
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "128"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ==================== Prometheus Metrics ====================
registry = CollectorRegistry()

def init_prometheus_metrics():
    """Initialize Prometheus metrics with a fresh registry"""
    global prediction_counter, prediction_duration, error_counter, model_loaded
    
    # Clear existing metrics if they exist
    try:
        if prediction_counter:
            registry.unregister(prediction_counter)
        if prediction_duration:
            registry.unregister(prediction_duration)
        if error_counter:
            registry.unregister(error_counter)
        if model_loaded:
            registry.unregister(model_loaded)
    except:
        pass  # Ignore if metrics don't exist yet
    
    prediction_counter = Counter(
        'mlops_transformer_predictions_total',
        'Total number of predictions made',
        registry=registry
    )
    prediction_duration = Histogram(
        'mlops_transformer_prediction_duration_seconds',
        'Time spent making predictions',
        registry=registry
    )
    error_counter = Counter(
        'mlops_transformer_errors_total',
        'Total number of errors',
        ['error_type'],
        registry=registry
    )
    model_loaded = Gauge(
        'mlops_transformer_model_loaded',
        'Whether the model is loaded (1) or not (0)',
        registry=registry
    )

# Initialize metrics
init_prometheus_metrics()

# ==================== Lifespan Manager ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print("🚀 Starting Transformer service...")
    global model, tokenizer, label_mapping
    try:
        # Load tokenizer from local path
        print(f"Loading tokenizer from: {MODEL_PATH}")
        from transformers import DistilBertTokenizer
        tokenizer = DistilBertTokenizer.from_pretrained(MODEL_PATH)
        print("✅ Tokenizer loaded")
        
        # Load model from local path
        from transformers import DistilBertForSequenceClassification
        model = DistilBertForSequenceClassification.from_pretrained(MODEL_PATH)
        model.to(DEVICE)
        model.eval()  # Set to evaluation mode
        print(f"✅ Model loaded on {DEVICE}")
        
        # Load label mapping
        with open(LABEL_MAPPING_PATH, 'r') as f:
            label_mapping = {int(k): v for k, v in json.load(f).items()}
        print(f"✅ Label mapping loaded: {len(label_mapping)} classes")
        print(f"📋 Classes: {list(label_mapping.values())}")
        
        model_loaded.set(1)
        print("✅ Transformer service ready!")
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        model_loaded.set(0)
        raise
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Transformer service...")
    model_loaded.set(0)
    model = None
    tokenizer = None
    label_mapping = None
# ==================== Pydantic Models ====================
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Ticket text to classify")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "text": "My laptop screen is broken and needs replacement"
            }
        }
    }
    
class PredictResponse(BaseModel):
    label: str = Field(..., description="Predicted category")
    confidence: float = Field(..., description="Confidence score (0-1)")
    all_scores: Dict[str, float] = Field(..., description="Scores for all categories")
    model: str = Field(default="transformer", description="Model used")
    processing_time: float = Field(..., description="Processing time in seconds")
    timestamp: str = Field(..., description="Prediction timestamp")

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    model_path: str

# ==================== FastAPI App ====================
app = FastAPI(
    title="CallCenterAI - Transformer Service",
    description="Transformer-based ticket classification using DistilBERT multilingual",
    version="1.0.0",
    lifespan=lifespan  # Add this line
)

# Global variables for model and tokenizer
model = None
tokenizer = None
label_mapping = None



# ==================== Endpoints ====================
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with service info"""
    return {
        "service": "CallCenterAI - Transformer Service",
        "model": "distilbert-base-multilingual-cased",
        "version": "1.0.0",
        "endpoints": {
            "predict": "/predict",
            "health": "/health",
            "metrics": "/metrics"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        device=DEVICE,
        model_path=MODEL_PATH
    )

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Predict ticket category using Transformer model
    
    Args:
        request: PredictRequest with ticket text
        
    Returns:
        PredictResponse with predicted label, confidence, and all scores
    """
    if model is None or tokenizer is None:
        error_counter.labels(error_type="model_not_loaded").inc()
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        # Tokenize input
        inputs = tokenizer(
            request.text,
            padding="max_length",
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt"
        )
        
        # Move to device
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        
        # Make prediction
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            
            # Apply softmax to get probabilities
            probs = torch.nn.functional.softmax(logits, dim=-1)
            probs = probs.cpu().numpy()[0]
        
        # Get predicted class
        pred_class = int(probs.argmax())
        confidence = float(probs[pred_class])
        predicted_label = label_mapping[pred_class]
        
        # Get all scores
        all_scores = {
            label_mapping[i]: float(probs[i])
            for i in range(len(probs))
        }
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Update metrics
        prediction_counter.inc()
        prediction_duration.observe(processing_time)
        
        return PredictResponse(
            label=predicted_label,
            confidence=confidence,
            all_scores=all_scores,
            model="transformer",
            processing_time=processing_time,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        error_counter.labels(error_type="prediction_error").inc()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(registry), media_type="text/plain")

# ==================== Main ====================
if __name__ == "__main__":
    import os
    reload_enabled = os.getenv("DEV_MODE", "false").lower() == "true"
    
    uvicorn.run(
        "transformer_service:app",
        host="0.0.0.0",
        port=8001,
        reload=reload_enabled,
        reload_dirs=["/app"] if reload_enabled else []
    )