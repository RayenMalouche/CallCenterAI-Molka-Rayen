"""
FastAPI Service for TF-IDF + SVM Model - CallCenterAI
Fast and efficient ticket classification using traditional NLP
"""

import os
import pickle
import time
from typing import Dict, List
from datetime import datetime

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from fastapi.responses import Response

# ==================== Configuration ====================
MODEL_PATH = os.getenv("MODEL_PATH", "./models/tfidf")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.7"))

# ==================== Prometheus Metrics ====================
def create_metrics():
    if any(name in REGISTRY._names_to_collectors for name in ["tfidf_predictions_total"]):
        # Metrics already exist, skip creation
        return

    global prediction_counter, prediction_duration, error_counter, model_loaded, low_confidence_counter

    prediction_counter = Counter(
        'tfidf_predictions_total',
        'Total number of predictions made'
    )
    prediction_duration = Histogram(
        'tfidf_prediction_duration_seconds',
        'Time spent making predictions'
    )
    error_counter = Counter(
        'tfidf_errors_total',
        'Total number of errors',
        ['error_type']
    )
    model_loaded = Gauge(
        'tfidf_model_loaded',
        'Whether the model is loaded (1) or not (0)'
    )
    low_confidence_counter = Counter(
        'tfidf_low_confidence_predictions',
        'Predictions with confidence below threshold'
    )
# ==================== Pydantic Models ====================
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Ticket text to classify")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Cannot login to my account"
            }
        }

class PredictResponse(BaseModel):
    label: str = Field(..., description="Predicted category")
    confidence: float = Field(..., description="Confidence score (0-1)")
    all_probabilities: Dict[str, float] = Field(..., description="Probabilities for all categories")
    model: str = Field(default="tfidf-svm", description="Model used")
    processing_time: float = Field(..., description="Processing time in seconds")
    timestamp: str = Field(..., description="Prediction timestamp")
    is_confident: bool = Field(..., description="Whether confidence exceeds threshold")

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_path: str
    confidence_threshold: float

# ==================== FastAPI App ====================
app = FastAPI(
    title="CallCenterAI - TF-IDF Service",
    description="Fast ticket classification using TF-IDF + SVM",
    version="1.0.0"
)

# Global variables
vectorizer = None
model = None
label_encoder = None

# ==================== Startup/Shutdown ====================
@app.on_event("startup")
async def load_model():
    """Load TF-IDF vectorizer, SVM model, and label encoder"""
    global vectorizer, model, label_encoder
    
    # Initialize metrics before loading model
    create_metrics()
    
    try:
        print(f"🚀 Loading TF-IDF model from: {MODEL_PATH}")
        
        # Load vectorizer
        vectorizer_path = os.path.join(MODEL_PATH, "vectorizer.pkl")
        with open(vectorizer_path, 'rb') as f:
            vectorizer = pickle.load(f)
        print("✅ Vectorizer loaded")
        
        # Load model
        model_path = os.path.join(MODEL_PATH, "model.pkl")
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        print("✅ SVM model loaded")
        
        # Load label encoder
        encoder_path = os.path.join(MODEL_PATH, "label_encoder.pkl")
        with open(encoder_path, 'rb') as f:
            label_encoder = pickle.load(f)
        print(f"✅ Label encoder loaded: {len(label_encoder.classes_)} classes")
        print(f"📋 Classes: {list(label_encoder.classes_)}")
        
        model_loaded.set(1)
        print(f"✅ TF-IDF service ready! (Threshold: {CONFIDENCE_THRESHOLD})")
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        model_loaded.set(0)
        raise

@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    print("🛑 Shutting down TF-IDF service...")
    model_loaded.set(0)

# ==================== Endpoints ====================
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with service info"""
    return {
        "service": "CallCenterAI - TF-IDF Service",
        "model": "TF-IDF + LinearSVM",
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
        status="healthy" if all([vectorizer, model, label_encoder]) else "unhealthy",
        model_loaded=all([vectorizer, model, label_encoder]),
        model_path=MODEL_PATH,
        confidence_threshold=CONFIDENCE_THRESHOLD
    )

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Predict ticket category using TF-IDF + SVM
    
    Fast predictions suitable for simple queries.
    Returns confidence scores to help routing decisions.
    """
    if not all([vectorizer, model, label_encoder]):
        error_counter.labels(error_type="model_not_loaded").inc()
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        # Vectorize input
        X = vectorizer.transform([request.text])
        
        # Get prediction and probabilities
        # Note: LinearSVC needs to be wrapped with CalibratedClassifierCV
        # to provide probability estimates
        try:
            probabilities = model.predict_proba(X)[0]
        except AttributeError:
            # If model doesn't have predict_proba, use decision_function
            decision = model.decision_function(X)[0]
            # Convert to pseudo-probabilities using softmax
            exp_scores = np.exp(decision - np.max(decision))
            probabilities = exp_scores / exp_scores.sum()
        
        # Get predicted class
        pred_class = int(probabilities.argmax())
        confidence = float(probabilities[pred_class])
        predicted_label = label_encoder.classes_[pred_class]
        
        # Check if confidence meets threshold
        is_confident = confidence >= CONFIDENCE_THRESHOLD
        if not is_confident:
            low_confidence_counter.inc()
        
        # Get all probabilities
        all_probabilities = {
            label_encoder.classes_[i]: float(probabilities[i])
            for i in range(len(probabilities))
        }
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Update metrics
        prediction_counter.inc()
        prediction_duration.observe(processing_time)
        
        return PredictResponse(
            label=predicted_label,
            confidence=confidence,
            all_probabilities=all_probabilities,
            model="tfidf-svm",
            processing_time=processing_time,
            timestamp=datetime.utcnow().isoformat(),
            is_confident=is_confident
        )
        
    except Exception as e:
        error_counter.labels(error_type="prediction_error").inc()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type="text/plain")

# ==================== Main ====================
if __name__ == "__main__":
    import os
    reload_enabled = os.getenv("DEV_MODE", "false").lower() == "true"
    
    uvicorn.run(
        "tfidf_service:app",
        host="0.0.0.0",
        port=8002,
        reload=reload_enabled,
        reload_dirs=["/app"] if reload_enabled else []
    )