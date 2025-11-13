"""
FastAPI Service for Transformer Model - CallCenterAI
Endpoint for ticket classification using DistilBERT multilingual model
"""

import os
import json
import time
from typing import Dict
from datetime import datetime
from contextlib import asynccontextmanager

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CollectorRegistry
from fastapi.responses import Response

# ==================== Configuration ====================
MODEL_PATH = os.getenv("MODEL_PATH", "C:/Users/rayen/Desktop/mlops/models/transformer/final_model")
LABEL_MAPPING_PATH = os.getenv("LABEL_MAPPING_PATH", "C:/Users/rayen/Desktop/mlops/models/transformer/label_mapping.json")
REMOTE_MODEL = "rayenmalouche/callcenterai-transformer"
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "128"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ==================== Prometheus Metrics ====================
registry = CollectorRegistry()

def init_prometheus_metrics():
    """Initialize Prometheus metrics with a fresh registry"""
    global prediction_counter, prediction_duration, error_counter, model_loaded
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
        pass

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

init_prometheus_metrics()

# ==================== Lifespan Manager ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    print("🚀 Starting Transformer service...")
    global model, tokenizer, label_mapping
    try:
        # Try to load locally
        if os.path.exists(MODEL_PATH):
            print(f"📁 Loading model locally from {MODEL_PATH}")
            tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
            model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
        else:
            print(f"🌐 Local model not found. Downloading from Hugging Face: {REMOTE_MODEL}")
            tokenizer = AutoTokenizer.from_pretrained(REMOTE_MODEL)
            model = AutoModelForSequenceClassification.from_pretrained(REMOTE_MODEL)
            os.makedirs(MODEL_PATH, exist_ok=True)
            tokenizer.save_pretrained(MODEL_PATH)
            model.save_pretrained(MODEL_PATH)
            print(f"✅ Model downloaded and saved to {MODEL_PATH}")

        model.to(DEVICE)
        model.eval()

        # Load label mapping
        if os.path.exists(LABEL_MAPPING_PATH):
            with open(LABEL_MAPPING_PATH, 'r') as f:
                label_mapping = {int(k): v for k, v in json.load(f).items()}
        else:
            print("⚠️ No label_mapping.json found. Using default index-based mapping.")
            label_mapping = {i: f"label_{i}" for i in range(model.config.num_labels)}

        print(f"✅ Model loaded on {DEVICE}")
        print(f"📋 Classes: {list(label_mapping.values())}")
        model_loaded.set(1)
        print("✅ Transformer service ready!")

    except Exception as e:
        print(f"❌ Error loading model: {e}")
        model_loaded.set(0)
        raise

    yield

    print("🛑 Shutting down Transformer service...")
    model_loaded.set(0)
    model = tokenizer = label_mapping = None

# ==================== Pydantic Models ====================
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Ticket text to classify")

class PredictResponse(BaseModel):
    label: str
    confidence: float
    all_scores: Dict[str, float]
    model: str
    processing_time: float
    timestamp: str

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
    lifespan=lifespan
)

model = tokenizer = label_mapping = None

# ==================== Endpoints ====================
@app.get("/")
async def root():
    return {
        "service": "CallCenterAI - Transformer Service",
        "model": REMOTE_MODEL,
        "version": "1.0.0",
        "endpoints": {
            "predict": "/predict",
            "health": "/health",
            "metrics": "/metrics"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        device=DEVICE,
        model_path=MODEL_PATH
    )

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    if model is None or tokenizer is None:
        error_counter.labels(error_type="model_not_loaded").inc()
        raise HTTPException(status_code=503, detail="Model not loaded")

    start_time = time.time()
    try:
        inputs = tokenizer(
            request.text,
            padding="max_length",
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt"
        )
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1).cpu().numpy()[0]

        pred_class = int(probs.argmax())
        confidence = float(probs[pred_class])
        predicted_label = label_mapping[pred_class]
        all_scores = {label_mapping[i]: float(probs[i]) for i in range(len(probs))}
        processing_time = time.time() - start_time

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
    return Response(content=generate_latest(registry), media_type="text/plain")

# ==================== Main ====================
if __name__ == "__main__":
    reload_enabled = os.getenv("DEV_MODE", "false").lower() == "true"
    uvicorn.run(
        "transformer_service:app",
        host="0.0.0.0",
        port=8001,
        reload=reload_enabled,
        reload_dirs=["/app"] if reload_enabled else []
    )
