# Kestrel: Deployment & Operational Runbook

## 1. Dual Deployment Modes

Kestrel is designed to run in two primary modes:
1. **Containerized Multi-Service Deployment (Docker Compose):** Production-like local deployment running Kafka (KRaft), Redis, PostgreSQL, Prometheus, Grafana, API, Stream Processor, Persistence Worker, and Frontend.
2. **Standalone Native Development Mode:** Fast local execution on Windows/Linux using Python virtual environments and Node.js without requiring Docker daemon to be running.

---

## 2. Containerized Deployment (Docker Compose)

### 2.1 Prerequisites
- Docker Engine >= 24.0.0
- Docker Compose >= 2.20.0

### 2.2 Startup Command
```bash
# Copy and configure environment
cp .env.example .env

# Build and start all services in detached mode
docker compose up --build -d

# Check service health
docker compose ps
```

### 2.3 Service Endpoints & UI Access
- **Kestrel Console (Frontend):** `http://localhost:5173`
- **Kestrel API & Swagger UI:** `http://localhost:8000/docs`
- **Prometheus Metrics Browser:** `http://localhost:9090`
- **Grafana Dashboards:** `http://localhost:3000` (Credentials: `admin` / `admin`)
- **Kafka Broker:** `localhost:9092`
- **Redis Cache:** `localhost:6379`
- **PostgreSQL Database:** `localhost:5432`

---

## 3. Standalone Native Local Execution (No Docker Required)

For environments where the Docker daemon is inactive or in CI test runners:

### Step 1: Virtual Environment & Dependencies
```powershell
# Activate Python virtual environment
.\.venv\Scripts\Activate.ps1

# Install project in editable mode
pip install -e packages/common
pip install -r services/api/requirements.txt
```

### Step 2: Run FastAPI Inference & Management Service
```powershell
python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 3: Run Frontend Development Server
```powershell
cd frontend
npm install
npm run dev
```

### Step 4: Run Transaction Generator & Stream Simulator
```powershell
python services/transaction-generator/app/main.py --mode stream --tps 10 --standalone
```
