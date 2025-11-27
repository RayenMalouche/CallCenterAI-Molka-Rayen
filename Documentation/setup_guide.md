# CallCenterAI - Complete Setup Guide

## 📋 Prerequisites

- Python 3.11+
- Docker & Docker Compose
- At least 8GB RAM (16GB recommended)
- GPU optional (for faster training, not required for inference)

## 📁 Project Structure

```
callcenterai/
├── models/
│   └── transformer/
│       ├── final_model/           # Trained model files
│       └── label_mapping.json     # Label mapping
├── services/
│   ├── transformer_service.py     # Transformer API
│   ├── tfidf_service.py          # TF-IDF API
│   └── agent_service.py          # Agent orchestrator
├── tests/
│   └── test_transformer_api.py
├── Dockerfile.transformer
├── Dockerfile.tfidf
├── Dockerfile.agent
├── docker-compose.yml
├── prometheus.yml
├── requirements.txt
└── README.md
```

## 🚀 Part 1: Testing the API Locally (Without Docker)

### Step 1: Prepare Your Model

After training your model with the provided script, you should have:
- `final_model/` directory with model files
- `label_mapping.json` file

Organize them like this:
```bash
mkdir -p models/transformer
cp -r /path/to/your/final_model models/transformer/
cp /path/to/your/label_mapping.json models/transformer/
```

### Step 2: Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### Step 3: Start the API

```bash
# Make sure you're in the project root
python transformer_service.py
```

You should see:
```
🚀 Loading model from: ./models/transformer/final_model
📱 Device: cuda (or cpu)
✅ Tokenizer loaded
✅ Model loaded on cuda
✅ Label mapping loaded: 8 classes
✅ Transformer service ready!
INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Step 4: Test the API

**Option A: Using the test script**
```bash
# In a new terminal
python test_transformer_api.py
```

**Option B: Using curl**
```bash
# Test health endpoint
curl http://localhost:8001/health

# Test prediction
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "My laptop screen is broken"}'

# View metrics
curl http://localhost:8001/metrics
```

**Option C: Using Python**
```python
import requests

# Predict
response = requests.post(
    "http://localhost:8001/predict",
    json={"text": "I cannot access my account"}
)
print(response.json())
```

**Option D: Interactive API Documentation**
```bash
# Open in browser
http://localhost:8001/docs
```

FastAPI automatically generates interactive documentation where you can:
- See all endpoints
- Test requests directly from the browser
- View request/response schemas

## 🐳 Part 2: Containerization with Docker

### Step 1: Prepare Docker Files

Create the following structure:
```bash
callcenterai/
├── Dockerfile.transformer
├── requirements.txt
├── transformer_service.py
└── models/
    └── transformer/
        ├── final_model/
        └── label_mapping.json
```

### Step 2: Build the Docker Image

```bash
# Build the image
docker build -f Dockerfile.transformer -t callcenterai-transformer:latest .

# This will take a few minutes...
```

### Step 3: Run the Container

```bash
# Run the container
docker run -d \
  --name transformer-service \
  -p 8001:8001 \
  -v $(pwd)/models:/app/models:ro \
  callcenterai-transformer:latest

# Check logs
docker logs -f transformer-service
```

### Step 4: Test the Containerized API

```bash
# Wait for the service to start (check logs)
# Then test
curl http://localhost:8001/health

# Or use the test script
python test_transformer_api.py
```

### Step 5: Stop and Remove Container

```bash
# Stop
docker stop transformer-service

# Remove
docker rm transformer-service

# Remove image (optional)
docker rmi callcenterai-transformer:latest
```

## 🎼 Part 3: Complete Stack with Docker Compose

### Step 1: Prepare All Services

You'll need to create:
1. **TF-IDF Service** (`tfidf_service.py` + `Dockerfile.tfidf`)
2. **Agent Service** (`agent_service.py` + `Dockerfile.agent`)
3. **Configuration files** (`prometheus.yml`, etc.)

### Step 2: Project Structure for Complete Stack

```bash
callcenterai/
├── services/
│   ├── transformer_service.py
│   ├── tfidf_service.py
│   └── agent_service.py
├── models/
│   ├── transformer/
│   │   ├── final_model/
│   │   └── label_mapping.json
│   └── tfidf/
│       ├── model.pkl
│       ├── vectorizer.pkl
│       └── label_encoder.pkl
├── Dockerfile.transformer
├── Dockerfile.tfidf
├── Dockerfile.agent
├── docker-compose.yml
├── prometheus.yml
└── requirements.txt
```

### Step 3: Start All Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f transformer
```

### Step 4: Access Services

Once all services are running:

- **Frontend (React)**: http://localhost
- **Transformer API**: http://localhost:8001/docs
- **TF-IDF API**: http://localhost:8002/docs
- **Agent API**: http://localhost:8000/docs
- **MLflow**: http://localhost:5000
- **Prometheus**: http://localhost:9200
- **Grafana**: http://localhost:3000 (admin/admin)

### Step 5: Test the Complete Stack

```bash
# Test individual services
curl http://localhost:8001/health  # Transformer
curl http://localhost:8002/health  # TF-IDF
curl http://localhost:8000/health  # Agent

# Test through the agent (intelligent routing)
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "My password is not working"}'
```

### Step 6: Monitor Services

**View Metrics in Prometheus:**
1. Open http://localhost:9200
2. Go to Status > Targets
3. Check that all services are "UP"
4. Query metrics like: `transformer_predictions_total`

**View Dashboard in Grafana:**
1. Open http://localhost:3000
2. Login with admin/admin
3. Add Prometheus as data source (http://prometheus:9200)
4. Create dashboards to visualize:
   - Request rate
   - Latency
   - Error rate
   - Prediction confidence

### Step 7: Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v
```

## 🧪 Part 4: Advanced Testing

### Load Testing

```python
# load_test.py
import concurrent.futures
import requests
import time

def send_request(text):
    try:
        response = requests.post(
            "http://localhost:8001/predict",
            json={"text": text},
            timeout=5
        )
        return response.status_code, response.elapsed.total_seconds()
    except Exception as e:
        return None, None

# Test with 100 concurrent requests
texts = ["Test ticket " + str(i) for i in range(100)]
start = time.time()

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(send_request, texts))

elapsed = time.time() - start
success = sum(1 for status, _ in results if status == 200)

print(f"Completed {len(results)} requests in {elapsed:.2f}s")
print(f"Success rate: {success}/{len(results)}")
print(f"Requests per second: {len(results)/elapsed:.2f}")
```

### Integration Testing

```bash
# Install pytest
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/ -v
```

## 📊 Part 5: Monitoring Setup

### Configure Grafana Dashboards

1. **Add Prometheus Data Source:**
   - Go to Configuration > Data Sources
   - Add Prometheus
   - URL: `http://prometheus:9200`
   - Save & Test

2. **Import Dashboard:**
   - Go to Dashboards > Import
   - Use dashboard ID: 1860 (Node Exporter)
   - Or create custom dashboard

3. **Create Custom Panels:**
   - Request Rate: `rate(transformer_predictions_total[5m])`
   - Latency: `histogram_quantile(0.95, transformer_prediction_duration_seconds)`
   - Error Rate: `rate(transformer_errors_total[5m])`

## 🔒 Part 6: Security Scanning

### Scan Docker Images with Trivy

```bash
# Install Trivy (on Linux)
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Scan image
trivy image callcenterai-transformer:latest

# Scan for high and critical only
trivy image --severity HIGH,CRITICAL callcenterai-transformer:latest
```

### Scan Code with Bandit

```bash
# Install Bandit
pip install bandit

# Scan Python files
bandit -r transformer_service.py

# Generate report
bandit -r . -f json -o security_report.json
```

## 🐛 Troubleshooting

### Model Not Loading

**Problem:** `FileNotFoundError: Model file not found`

**Solution:**
```bash
# Check if models are in the right place
ls -la models/transformer/final_model/

# Check Docker volume mount
docker inspect transformer-service | grep Mounts -A 20
```

### Out of Memory

**Problem:** Container crashes with OOM error

**Solution:**
```bash
# Increase Docker memory limit
# Edit docker-compose.yml
services:
  transformer:
    deploy:
      resources:
        limits:
          memory: 4G
```

### Port Already in Use

**Problem:** `Address already in use`

**Solution:**
```bash
# Find process using port
lsof -i :8001

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### CUDA Out of Memory (GPU)

**Problem:** CUDA OOM during inference

**Solution:**
```python
# In transformer_service.py, reduce batch size or use CPU
DEVICE = "cpu"  # Force CPU
```

## 📝 Quick Reference Commands

```bash
# Local Development
python transformer_service.py              # Start API
python test_transformer_api.py            # Test API

# Docker Single Service
docker build -f Dockerfile.transformer -t transformer .
docker run -d -p 8001:8001 --name trans transformer
docker logs -f trans
docker stop trans && docker rm trans

# Docker Compose
docker-compose up -d                       # Start all
docker-compose ps                          # List services
docker-compose logs -f transformer         # View logs
docker-compose restart transformer         # Restart service
docker-compose down                        # Stop all

# Monitoring
curl http://localhost:8001/metrics         # Prometheus metrics
curl http://localhost:8001/health          # Health check
```

## 📚 Additional Resources

- FastAPI Documentation: https://fastapi.tiangolo.com/
- Docker Documentation: https://docs.docker.com/
- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- MLflow: https://mlflow.org/docs/

## 🤝 Need Help?

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify health endpoints
3. Check Prometheus targets
4. Review this guide carefully
