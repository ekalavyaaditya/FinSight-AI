# FinSight AI Platform

FinSight AI is a comprehensive financial insights and multi-service platform. It integrates a modern frontend, a robust Express.js backend, and an intelligent Python AI service, all containerized with Docker and orchestrated via Docker Compose.

---

## Architecture Overview

The system consists of three main service layers, along with database and caching components:

1. **Frontend (React SPA)**
   - **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Zustand, Framer Motion.
   - **Deployment:** Served via Nginx on port `3000`.
   - **Source Directory:** Root directory (excluding `/server` and `/ai`).

2. **Backend Server (Express.js)**
   - **Tech Stack:** Node.js (v22), Express, TypeScript, Prisma ORM, PostgreSQL, Redis.
   - **Port:** `5000`
   - **Source Directory:** `/server`

3. **AI Service (Python FastAPI)**
   - **Tech Stack:** Python 3.12, FastAPI, Uvicorn, Pandas, Scikit-Learn.
   - **Port:** `8000`
   - **Source Directory:** `/ai`

4. **Databases & Cache**
   - **PostgreSQL:** Port `5432` (relational database for users, transactions, and settings).
   - **Redis:** Port `6379` (caching, rate-limiting, and session storage).

---

## Quick Start (Docker Compose)

To build and start all services in production mode:

```bash
docker-compose up --build
```

This will automatically:
- Start PostgreSQL and Redis instances.
- Build the server image and run DB migrations with Prisma.
- Build the AI service.
- Build and serve the React frontend through an Nginx proxy.

---

## Development Setup

If you prefer to run services individually for local development:

### Prerequisites
- Node.js (v22+)
- Python (v3.12+)
- Docker (for database/redis instances)

### 1. Database and Cache
Start the local PostgreSQL and Redis services:
```bash
docker-compose up -d db redis
```

### 2. Backend Server
Navigate to the `/server` directory:
```bash
cd server
npm install
npm run dev
```
To run backend tests:
```bash
npm run test
```

### 3. AI Service
Navigate to the `/ai` directory:
```bash
cd ai
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 4. Frontend Application
From the repository root:
```bash
npm install
npm run dev
```

---

## Development Best Practices

- **Build Optimization:** The project contains `.dockerignore` files configured at the root, in `/server`, and `/ai`. These exclude local dependencies (`node_modules`), build artifacts (`dist`), and Python caches from being sent to Docker, drastically speeding up container builds and preventing resource exhaustion.
- **Testing:** Always run test suites before submitting pull requests. For backend verification, use `npm run test` inside the `/server` folder.
