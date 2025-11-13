# 🎯 CallCenterAI - MLOps Project

> Intelligent ticket classification system with automated routing, containerization, and complete MLOps pipeline

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![MLflow](https://img.shields.io/badge/MLflow-tracking-orange.svg)](https://mlflow.org/)

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Services](#services)
- [Training Models](#training-models)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [CI/CD](#cicd)
- [API Documentation](#api-documentation)

## 🎯 Overview

CallCenterAI is a complete MLOps solution for automatically classifying customer support tickets from call centers. It uses **two complementary NLP approaches**:

1. **TF-IDF + SVM**: Fast, traditional model for simple queries
2. **Transformer (DistilBERT)**: Advanced multilingual model for complex queries

An **intelligent agent** dynamically routes requests to the appropriate model based on text characteristics, ensuring optimal performance and cost-efficiency.

### Key Capabilities

- ✅ Multi-model classification (TF-IDF + Transformer)
- ✅ Intelligent routing with confidence thresholds
- ✅ PII (Personally Identifiable Information) scrubbing
- ✅ Multilingual support (104 languages)
- ✅ Complete containerization with Docker
- ✅ Prometheus + Grafana monitoring
- ✅ MLflow experiment tracking
- ✅ CI/CD with GitHub Actions
- ✅ Comprehensive testing suite

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Agent Service  │ ◄─── Intelligent Router
│  (Port 8000)    │      • PII Scrubbing
└────────┬────────┘      • Routing Logic
         │               • Metrics
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────────┐
│TFIDF │  │Transform.│
│8002  │  │  8001    │
└──┬───┘  └────┬─────┘
   │           │
   └─────┬─────┘
         ▼
   ┌─────────────┐
   │ Prometheus  │ ──► Grafana
   │  (9090)     │     (3000)
   └─────────────┘
```

## ✨ Features

### 🤖 Intelligent Routing

The agent automatically selects the best model based on:

| Criterion | Action |
|-----------|--------|
| Text < 50 chars | → TF-IDF (fast) |
| Multilingual text | → Transformer |
| Text > 200 chars | → Transformer |
| TF-IDF confidence > 85% | → Use TF-IDF |
| TF-IDF confidence < 85% | → Fallback to Transformer |

### 🔒 PII Protection

Automatically detects and masks:
- Email addresses → `[EMAIL]`
- Phone numbers → `[PHONE]`
- SSN → `[SSN]`
- Credit cards → `[CARD]`
- IP addresses → `[IP]`

### 📊 Monitoring

- Real-time metrics with Prometheus
- Custom Grafana dashboards
- Request rate, latency, error tracking
- Model confidence distribution

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Python 3.11+
- Docker & Docker Compose
- 8GB RAM minimum (16GB recommended)

# Optional
- NVIDIA GPU (for faster training)
- Make (for shortcuts)
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/callcenterai.git
cd callcenterai

# 2. Download and prepare dataset
# Download from: https://www.kaggle.com/datasets/maheshdadhich/it-service-ticket-classification
mkdir -p data
# Place all_tickets_cleaned.csv in data/

# 3. Train models
python train_tfidf.py
python transformers.py  # Or run in Google Colab

# 4. Build and start services
docker-compose up -d

# 5. Check services are running
docker-compose ps
```

### Verify Installation

```bash
# Test all services
curl http://localhost:8000/health  # Agent
curl http://localhost:8001/health  # Transformer
curl http://localhost:8002/health  # TF-IDF

# Make a prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "My laptop screen is broken"}'
```

## 📁 Project Structure

```
callcenterai/
│
├── services/
│   ├── transformer_service.py      # Transformer API
│   ├── tfidf_service.py           # TF-IDF API
│   └── agent_service.py           # Agent/Router
│
├── models/
│   ├── transformer/
│   │   ├── final_model/           # Trained transformer
│   │   └── label_mapping.json
│   └── tfidf/
│       ├── model.pkl
│       ├── vectorizer.pkl
│       └── label_encoder.pkl
│
├── tests/
│   ├── test_transformer_api.py
│   ├── test_tfidf_api.py
│   └── test_agent.py
│
├── training/
│   ├── train_tfidf.py
│   └── transformers.py
│
├── docker/
│   ├── Dockerfile.transformer
│   ├── Dockerfile.tfidf
│   └── Dockerfile.agent
│
├── monitoring/
│   ├── prometheus.yml
│   └── grafana/
│       └── dashboards/
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml
│
├── docker-compose.yml
├── requirements.txt
├── requirements-agent.txt
└── README.md
```

## 🛠️ Services

### 1. Transformer Service (Port 8001)

**Description**: Advanced NLP model using DistilBERT multilingual

**Endpoints**:
- `GET /` - Service info
- `GET /health` - Health check
- `POST /predict` - Classify ticket
- `GET /metrics` - Prometheus metrics

**Example**:
```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Mon ordinateur ne fonctionne pas"}'
```

**Response**:
```json
{
  "label": "Hardware",
  "confidence": 0.9543,
  "all_scores": {
    "Hardware": 0.9543,
    "Software": 0.0234,
    ...
  },
  "model": "transformer",
  "processing_time": 0.145,
  "timestamp": "2025-10-22T10:30:00"
}
```

### 2. TF-IDF Service (Port 8002)

**Description**: Fast traditional NLP model for quick classifications

**Endpoints**:
- `GET /` - Service info
- `GET /health` - Health check
- `POST /predict` - Classify ticket
- `GET /metrics` - Prometheus metrics

**Example**:
```bash
curl -X POST http://localhost:8002/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Password reset"}'
```

### 3. Agent Service (Port 8000)

**Description**: Intelligent router with PII scrubbing

**Endpoints**:
- `GET /` - Service info
- `GET /health` - Health check (checks downstream services)
- `POST /predict` - Smart prediction with routing
- `GET /metrics` - Prometheus metrics

**Example with routing**:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "My email is john@example.com and I need password reset"}'
```

**Response**:
```json
{
  "label": "Access",
  "confidence": 0.89,
  "all_scores": {...},
  "routing": {
    "chosen_model": "tfidf",
    "reason": "high_confidence_tfidf",
    "text_length": 45,
    "has_multilingual": false,
    "pii_scrubbed": true
  },
  "processing_time": 0.034,
  "timestamp": "2025-10-22T10:30:00"
}
```

## 🎓 Training Models

### Train TF-IDF Model

```bash
python train_tfidf.py
```

**Output**:
- `models/tfidf/model.pkl` - Calibrated SVM model
- `models/tfidf/vectorizer.pkl` - TF-IDF vectorizer
- `models/tfidf/label_encoder.pkl` - Label encoder
- `models/tfidf/metadata.json` - Training metrics
- `models/tfidf/plots/` - Visualizations

### Train Transformer Model

```bash
# Option 1: Local (requires GPU recommended)
python transformers.py

# Option 2: Google Colab (recommended)
# Upload transformers.py to Colab and run
```

**Output**:
- `models/transformer/final_model/` - Model files
- `models/transformer/label_mapping.json` - Label mapping
- `models/transformer/plots/` - Visualizations
- `models/transformer/training_results.json` - Metrics

## 🧪 Testing

### Run All Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_transformer_api.py -v

# Run with coverage
pytest tests/ --cov=services --cov-report=html
```

### Manual Testing

```bash
# Test Transformer service
python test_transformer_api.py

# Test individual endpoint
curl http://localhost:8001/predict \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "Need help with printer setup"}'

# Check metrics
curl http://localhost:8001/metrics
```

### Load Testing

```python
# load_test.py
import concurrent.futures
import requests
import time

def test_request():
    response = requests.post(
        "http://localhost:8000/predict",
        json={"text": "Test ticket"},
        timeout=5
    )
    return response.status_code == 200

# Run 100 concurrent requests
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(lambda _: test_request(), range(100)))
    
success_rate = sum(results) / len(results)
print(f"Success rate: {success_rate:.2%}")
```

## 📊 Monitoring

### Prometheus Metrics

Access Prometheus at: http://localhost:9090

**Key Metrics**:

| Metric | Description |
|--------|-------------|
| `transformer_predictions_total` | Total predictions made |
| `transformer_prediction_duration_seconds` | Prediction latency |
| `transformer_errors_total` | Total errors by type |
| `tfidf_predictions_total` | TF-IDF predictions |
| `agent_routing_total` | Routing decisions by model |
| `agent_pii_scrubbed_total` | PII scrubbing operations |

**Example Queries**:
```promql
# Request rate (requests per second)
rate(transformer_predictions_total[5m])

# 95th percentile latency
histogram_quantile(0.95, transformer_prediction_duration_seconds)

# Error rate
rate(transformer_errors_total[5m])

# Model usage distribution
sum by (model) (agent_routing_total)
```

### Grafana Dashboards

Access Grafana at: http://localhost:3000 (admin/admin)

**Setup**:
1. Add Prometheus data source: `http://prometheus:9090`
2. Import dashboard or create custom panels

**Recommended Panels**:

1. **Request Rate**
   ```promql
   sum(rate(transformer_predictions_total[5m])) +
   sum(rate(tfidf_predictions_total[5m]))
   ```

2. **Average Latency**
   ```promql
   avg(transformer_prediction_duration_seconds)
   ```

3. **Model Usage (Pie Chart)**
   ```promql
   sum by (model) (agent_routing_total)
   ```

4. **Error Rate**
   ```promql
   sum(rate(transformer_errors_total[5m]))
   ```

5. **Confidence Distribution**
   - Create histogram of confidence scores

### MLflow Tracking

Access MLflow at: http://localhost:5000

**Features**:
- Experiment tracking
- Model versioning
- Metrics comparison
- Model registry

**Usage**:
```python
import mlflow

# Log metrics during training
mlflow.log_metric("accuracy", 0.95)
mlflow.log_metric("f1_score", 0.93)

# Log model
mlflow.sklearn.log_model(model, "tfidf-model")
```

## 🔄 CI/CD

### GitHub Actions Workflow

The project includes a complete CI/CD pipeline:

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    - Lint code (black, flake8, isort)
    - Run unit tests
    - Check test coverage
  
  security:
    - Scan with Bandit
    - Scan Docker images with Trivy
  
  build:
    - Build Docker images
    - Push to registry
    
  deploy:
    - Deploy to staging/production
```

### Manual CI/CD Steps

```bash
# 1. Lint code
black services/ --check
flake8 services/
isort services/ --check

# 2. Run tests
pytest tests/ -v

# 3. Security scan
bandit -r services/
trivy image callcenterai-transformer:latest

# 4. Build images
docker-compose build

# 5. Push to registry (optional)
docker tag callcenterai-transformer:latest your-registry/transformer:latest
docker push your-registry/transformer:latest
```

## 📖 API Documentation

### Interactive API Docs

Each service provides interactive documentation:

- **Transformer**: http://localhost:8001/docs
- **TF-IDF**: http://localhost:8002/docs
- **Agent**: http://localhost:8000/docs

### Request/Response Examples

#### Basic Prediction

**Request**:
```bash
POST /predict
Content-Type: application/json

{
  "text": "I cannot login to my account"
}
```

**Response**:
```json
{
  "label": "Access",
  "confidence": 0.92,
  "all_scores": {
    "Access": 0.92,
    "Hardware": 0.03,
    "Software": 0.02,
    "HR Support": 0.01,
    "Purchase": 0.01,
    "Storage": 0.01
  },
  "routing": {
    "chosen_model": "tfidf",
    "reason": "high_confidence_tfidf",
    "text_length": 32,
    "has_multilingual": false,
    "pii_scrubbed": false
  },
  "processing_time": 0.028,
  "timestamp": "2025-10-22T10:30:00.123Z"
}
```

#### Force Specific Model

**Request**:
```bash
POST /predict
Content-Type: application/json

{
  "text": "Complex technical issue...",
  "force_model": "transformer"
}
```

#### Multilingual Example

**Request**:
```bash
POST /predict
Content-Type: application/json

{
  "text": "Mon ordinateur portable ne démarre pas"
}
```

**Response**:
```json
{
  "label": "Hardware",
  "confidence": 0.96,
  "routing": {
    "chosen_model": "transformer",
    "reason": "multilingual_detected",
    "has_multilingual": true
  }
}
```

## 🐳 Docker Commands

### Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f transformer

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Individual Services

```bash
# Build single service
docker build -f Dockerfile.transformer -t transformer .

# Run single service
docker run -d -p 8001:8001 \
  -v $(pwd)/models:/app/models:ro \
  --name transformer \
  transformer

# Execute command in container
docker exec -it transformer bash

# View resource usage
docker stats
```

### Troubleshooting

```bash
# Check container status
docker-compose ps

# Restart specific service
docker-compose restart transformer

# View detailed logs
docker-compose logs --tail=100 transformer

# Rebuild without cache
docker-compose build --no-cache

# Clean up everything
docker system prune -a --volumes
```

## 🔒 Security

### Code Security

```bash
# Scan Python code
bandit -r services/ -f json -o security_report.json

# Check for vulnerabilities in dependencies
pip-audit
```

### Container Security

```bash
# Scan Docker image
trivy image callcenterai-transformer:latest

# Scan for HIGH and CRITICAL only
trivy image --severity HIGH,CRITICAL callcenterai-transformer:latest

# Generate report
trivy image callcenterai-transformer:latest -f json -o report.json
```

### Best Practices

- ✅ PII scrubbing enabled by default
- ✅ Read-only volume mounts for models
- ✅ Non-root user in containers
- ✅ Minimal base images (python:3.11-slim)
- ✅ Security scanning in CI/CD
- ✅ Regular dependency updates

## 🐛 Troubleshooting

### Common Issues

#### 1. Model Not Loading

**Problem**: `FileNotFoundError: Model file not found`

**Solution**:
```bash
# Check model files exist
ls -la models/transformer/final_model/
ls -la models/tfidf/

# Verify Docker volume mount
docker inspect transformer | grep Mounts -A 20
```

#### 2. Out of Memory

**Problem**: Container crashes with OOM

**Solution**:
```yaml
# Edit docker-compose.yml
services:
  transformer:
    deploy:
      resources:
        limits:
          memory: 4G
```

#### 3. Port Already in Use

**Problem**: `bind: address already in use`

**Solution**:
```bash
# Find process using port
lsof -i :8001

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

#### 4. Services Can't Communicate

**Problem**: Agent can't reach Transformer/TF-IDF

**Solution**:
```bash
# Check network
docker network ls
docker network inspect callcenterai-network

# Verify service names in docker-compose
# Use service names (e.g., 'transformer') not 'localhost'
```

#### 5. Low Prediction Accuracy

**Problem**: Poor model performance

**Solution**:
- Retrain with more data
- Adjust hyperparameters
- Check data quality
- Verify preprocessing steps

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Transformers Documentation](https://huggingface.co/docs/transformers/)
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is part of the ENSIT MLOps course (Mini-Projet 2025).

## 👥 Authors

- **Your Name** - Initial work - [GitHub Profile](https://github.com/yourusername)

## 🙏 Acknowledgments

- ENSIT - École nationale supérieure d'ingénieurs de Tunis
- Kaggle for the IT Service Ticket Classification Dataset
- Hugging Face for transformer models

---

**Project Status**: ✅ Production Ready

**Last Updated**: October 2025

For questions or issues, please open an issue on GitHub or contact the maintainers.