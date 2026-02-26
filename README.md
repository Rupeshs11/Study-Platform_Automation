# Study Platform

AI-powered learning platform that generates personalized study roadmaps based on your goals, experience level, and available time.

## Stack

- **Backend**: Spring Boot 3.2, Java 21, MongoDB
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **AI**: NVIDIA API (GLM model)
- **Infra**: Docker (MongoDB, Redis)

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
