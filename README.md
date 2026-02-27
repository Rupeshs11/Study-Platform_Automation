# Study Platform

AI-powered learning platform that generates personalized study roadmaps based on your goals, experience level, and available time.

## Stack

- **Backend**: Spring Boot 3.2, Java 21, MongoDB
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **AI**: NVIDIA API (GLM model)
- **Infra**: Docker, Kubernetes, MongoDB, Redis

## Quick Start

### Prerequisites

- Java 21+
- Node.js 18+
- Docker

### 1. Start Services

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Add your NVIDIA_API_KEY to .env
./mvnw spring-boot:run
```

Runs on `http://localhost:8080/api`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

## Project Structure

```
study-platform/
├── backend/           # Spring Boot API
│   └── src/main/java/com/study/
│       ├── controller/    # REST endpoints
│       ├── service/       # Business logic
│       ├── model/         # MongoDB documents
│       └── config/        # Security, CORS
├── frontend/          # React SPA
│   └── src/
│       ├── pages/         # Route components
│       ├── components/    # UI components
│       ├── api/           # API client
│       └── context/       # Auth, state
├── k8s/               # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── mongodb-statefulset.yaml
│   ├── redis-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── network-policy.yaml
├── Testing/           # API test scripts
└── docker-compose.yml # MongoDB, Redis
```

## Features

- JWT authentication
- AI-generated learning roadmaps
- Topic content generation
- Progress tracking
- Gamification (XP, streaks, achievements)

## Environment Variables

Backend (`.env`):
```
NVIDIA_API_KEY=your_key_here
```

## Kubernetes Deployment

Deploy to Kubernetes using the manifests in the `k8s/` directory:

```bash
# Create namespace and apply configs
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -f k8s/secrets.yaml

# Deploy databases
kubectl apply -f k8s/mongodb-statefulset.yaml -f k8s/redis-deployment.yaml

# Deploy application
kubectl apply -f k8s/backend-deployment.yaml -f k8s/frontend-deployment.yaml

# Optional: Ingress and autoscaling
kubectl apply -f k8s/ingress.yaml -f k8s/hpa.yaml
```

**Note:** Update `k8s/secrets.yaml` with your actual credentials before deploying. See [k8s/README.md](k8s/README.md) for detailed instructions.
