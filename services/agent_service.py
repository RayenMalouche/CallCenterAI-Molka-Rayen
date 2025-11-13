"""
Agent Service - Intelligent Router for CallCenterAI
Routes requests to TF-IDF or Transformer based on complexity analysis
Handles PII scrubbing and provides routing explanations
"""

import os
import re
import time
from typing import Dict, Optional
from datetime import datetime
from enum import Enum
from contextlib import asynccontextmanager

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from fastapi.responses import Response


# ==================== Configuration ====================
TFIDF_URL = os.getenv("TFIDF_URL", "http://localhost:8002")
TRANSFORMER_URL = os.getenv("TRANSFORMER_URL", "http://localhost:8001")
TFIDF_CONFIDENCE_THRESHOLD = float(os.getenv("TFIDF_CONFIDENCE_THRESHOLD", "0.85"))
SHORT_TEXT_THRESHOLD = int(os.getenv("SHORT_TEXT_THRESHOLD", "50"))
LONG_TEXT_THRESHOLD = int(os.getenv("LONG_TEXT_THRESHOLD", "200"))


# ==================== Prometheus Metrics (Singleton Pattern) ====================
def create_metrics():
    """Create metrics only once per process"""
    existing = REGISTRY._names_to_collectors.keys()
    if 'agent_routing_total' in existing:
        return  # Already created

    global routing_counter, routing_duration, pii_scrubbed_counter, error_counter, services_health

    routing_counter = Counter(
        'agent_routing_total',
        'Total routing decisions',
        ['model']
    )
    routing_duration = Histogram(
        'agent_routing_duration_seconds',
        'Time spent routing requests'
    )
    pii_scrubbed_counter = Counter(
        'agent_pii_scrubbed_total',
        'Total PII scrubbing operations'
    )
    error_counter = Counter(
        'agent_errors_total',
        'Total errors',
        ['error_type']
    )
    services_health = Gauge(
        'agent_downstream_services_health',
        'Health status of downstream services (1=healthy, 0=unhealthy)',
        ['service']
    )

# Initialize on import (safe)
create_metrics()


# ==================== Enums ====================
class ModelChoice(str, Enum):
    TFIDF = "tfidf"
    TRANSFORMER = "transformer"

class RoutingReason(str, Enum):
    SHORT_SIMPLE = "short_simple_text"
    HIGH_CONFIDENCE_TFIDF = "high_confidence_tfidf"
    LOW_CONFIDENCE_TFIDF = "low_confidence_tfidf"
    LONG_COMPLEX = "long_complex_text"
    MULTILINGUAL = "multilingual_detected"
    FALLBACK = "fallback_to_transformer"


# ==================== Pydantic Models ====================
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Ticket text to classify")
    force_model: Optional[ModelChoice] = Field(None, description="Force specific model")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "I cannot access my account, password reset not working"
            }
        }
    )


class RoutingDecision(BaseModel):
    chosen_model: ModelChoice
    reason: RoutingReason
    text_length: int
    has_multilingual: bool
    pii_scrubbed: bool


class AgentResponse(BaseModel):
    label: str
    confidence: float
    all_scores: Dict[str, float]
    routing: RoutingDecision
    processing_time: float
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    tfidf_service: bool
    transformer_service: bool
    tfidf_url: str
    transformer_url: str


# ==================== FastAPI App with Lifespan ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_metrics()  # Extra safety
    print("Agent Service Starting up...")
    print(f"TF-IDF URL: {TFIDF_URL}")
    print(f"Transformer URL: {TRANSFORMER_URL}")
    yield
    # Shutdown
    print("Agent Service Shutting down...")


app = FastAPI(
    title="CallCenterAI - Agent Service",
    description="Intelligent routing agent for ticket classification",
    version="1.0.0",
    lifespan=lifespan
)


# ==================== PII Scrubbing ====================
PII_PATTERNS = {
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'phone': r'\b(?:\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b',
    'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
    'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
    'ip_address': r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
}

def scrub_pii(text: str) -> tuple[str, bool]:
    cleaned = text
    pii_found = False
    
    for pii_type, pattern in PII_PATTERNS.items():
        matches = re.findall(pattern, cleaned)
        if matches:
            pii_found = True
            placeholder = f'[{pii_type.upper()}]'
            cleaned = re.sub(pattern, placeholder, cleaned)
    
    if pii_found:
        pii_scrubbed_counter.inc()
    
    return cleaned, pii_found


# ==================== Language Detection ====================
def detect_multilingual(text: str) -> bool:
    patterns = [
        r'[àâäæçéèêëïîôùûüÿœÀÂÄÆÇÉÈÊËÏÎÔÙÛÜŸŒ]',  # French
        r'[\u0600-\u06FF]',                          # Arabic
        r'[áíóúñÁÍÓÚÑ]',                             # Spanish
        r'[äöüßÄÖÜ]',                                # German
    ]
    return any(re.search(p, text) for p in patterns)


# ==================== Routing Logic ====================
async def make_routing_decision(text: str, force_model: Optional[ModelChoice]) -> RoutingDecision:
    cleaned_text, pii_found = scrub_pii(text)
    text_length = len(cleaned_text)
    is_multilingual = detect_multilingual(cleaned_text)

    if force_model:
        return RoutingDecision(
            chosen_model=force_model,
            reason=RoutingReason.FALLBACK,
            text_length=text_length,
            has_multilingual=is_multilingual,
            pii_scrubbed=pii_found
        )

    if text_length < SHORT_TEXT_THRESHOLD:
        return RoutingDecision(
            chosen_model=ModelChoice.TFIDF,
            reason=RoutingReason.SHORT_SIMPLE,
            text_length=text_length,
            has_multilingual=is_multilingual,
            pii_scrubbed=pii_found
        )

    if is_multilingual:
        return RoutingDecision(
            chosen_model=ModelChoice.TRANSFORMER,
            reason=RoutingReason.MULTILINGUAL,
            text_length=text_length,
            has_multilingual=is_multilingual,
            pii_scrubbed=pii_found
        )

    if text_length > LONG_TEXT_THRESHOLD:
        return RoutingDecision(
            chosen_model=ModelChoice.TRANSFORMER,
            reason=RoutingReason.LONG_COMPLEX,
            text_length=text_length,
            has_multilingual=is_multilingual,
            pii_scrubbed=pii_found
        )

    # Medium text → will try TF-IDF with confidence check
    return RoutingDecision(
        chosen_model=ModelChoice.TFIDF,
        reason=RoutingReason.HIGH_CONFIDENCE_TFIDF,
        text_length=text_length,
        has_multilingual=is_multilingual,
        pii_scrubbed=pii_found
    )


# ==================== Endpoints ====================
@app.get("/", response_model=Dict[str, str])
async def root():
    return {
        "service": "CallCenterAI - Agent Service",
        "version": "1.0.0",
        "endpoints": {
            "predict": "/predict",
            "health": "/health",
            "metrics": "/metrics"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    tfidf_healthy = False
    transformer_healthy = False
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            r = await client.get(f"{TFIDF_URL}/health")
            tfidf_healthy = r.status_code == 200
        except:
            pass
        
        try:
            r = await client.get(f"{TRANSFORMER_URL}/health")
            transformer_healthy = r.status_code == 200
        except:
            pass
    
    services_health.labels(service='tfidf').set(1 if tfidf_healthy else 0)
    services_health.labels(service='transformer').set(1 if transformer_healthy else 0)
    
    status = "healthy" if tfidf_healthy and transformer_healthy else "degraded"
    
    return HealthResponse(
        status=status,
        tfidf_service=tfidf_healthy,
        transformer_service=transformer_healthy,
        tfidf_url=TFIDF_URL,
        transformer_url=TRANSFORMER_URL
    )


@app.post("/predict", response_model=AgentResponse)
async def predict(request: PredictRequest):
    start_time = time.time()
    
    try:
        cleaned_text, _ = scrub_pii(request.text)
        routing = await make_routing_decision(cleaned_text, request.force_model)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            
            # Try TF-IDF first if not forced
            if routing.chosen_model == ModelChoice.TFIDF and not request.force_model:
                try:
                    resp = await client.post(f"{TFIDF_URL}/predict", json={"text": cleaned_text})
                    resp.raise_for_status()
                    result = resp.json()
                    
                    if result['confidence'] >= TFIDF_CONFIDENCE_THRESHOLD:
                        routing.reason = RoutingReason.HIGH_CONFIDENCE_TFIDF
                        routing_counter.labels(model='tfidf').inc()
                    else:
                        routing.chosen_model = ModelChoice.TRANSFORMER
                        routing.reason = RoutingReason.LOW_CONFIDENCE_TFIDF
                except Exception as e:
                    print(f"TF-IDF failed: {e} → fallback to Transformer")
                    routing.chosen_model = ModelChoice.TRANSFORMER
                    routing.reason = RoutingReason.FALLBACK
            
            # Final routing
            if routing.chosen_model == ModelChoice.TRANSFORMER:
                resp = await client.post(f"{TRANSFORMER_URL}/predict", json={"text": cleaned_text})
                resp.raise_for_status()
                result = resp.json()
                routing_counter.labels(model='transformer').inc()
                key = 'all_scores'
            else:
                resp = await client.post(f"{TFIDF_URL}/predict", json={"text": cleaned_text})
                resp.raise_for_status()
                result = resp.json()
                routing_counter.labels(model='tfidf').inc()
                key = 'all_probabilities'
            
            processing_time = time.time() - start_time
            routing_duration.observe(processing_time)
            
            return AgentResponse(
                label=result['label'],
                confidence=result['confidence'],
                all_scores=result[key],
                routing=routing,
                processing_time=processing_time,
                timestamp=datetime.utcnow().isoformat()
            )
            
    except HTTPException:
        raise
    except Exception as e:
        error_counter.labels(error_type='routing_error').inc()
        raise HTTPException(status_code=500, detail=f"Routing error: {str(e)}")


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")


# ==================== Main ====================
if __name__ == "__main__":
    import os
    reload_enabled = os.getenv("DEV_MODE", "false").lower() == "true"
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=reload_enabled,
        reload_dirs=["/app"] if reload_enabled else []
    )