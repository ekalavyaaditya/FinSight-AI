# FinSight AI Platform

FinSight AI is a comprehensive financial insights and multi-service platform. It integrates a modern frontend, a robust Express.js backend, and an intelligent Python AI service — all running locally for development.

---

## Architecture Overview

The system consists of three main service layers, along with database and caching components:

1. **Frontend (React SPA)**
   - **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Zustand, Framer Motion.
   - **Port:** `5173` (Vite dev server)
   - **Source Directory:** `/frontend`

2. **Backend Server (Express.js)**
   - **Tech Stack:** Node.js (v22), Express, TypeScript, Prisma ORM, PostgreSQL, Redis.
   - **Port:** `5000`
   - **Source Directory:** `/server`

3. **AI Service (Python FastAPI)**
   - **Tech Stack:** Python 3.12, FastAPI, Uvicorn, Pandas, Scikit-Learn.
   - **Port:** `8000`
   - **Source Directory:** `/ai`

4. **Databases & Cache**
   - **PostgreSQL:** Port `5432` (relational database for users, transactions, and settings). Install and run locally.
   - **Redis (optional):** Port `6379` (caching). The server falls back gracefully if Redis is unavailable.

---

## Prerequisites

- Node.js (v22+)
- Python (v3.12+)
- PostgreSQL (v15+ recommended) — installed and running locally
- Redis (optional) — installed and running locally

---

## Development Setup

### 1. Database

Ensure PostgreSQL is running locally. Create the database if it doesn't already exist:

```sql
CREATE DATABASE finsight_db;
```

### 2. Backend Server

```bash
cd server
cp .env.example .env      # edit .env with your local Postgres credentials
npm install
npx prisma generate
npx prisma db push         # apply schema to local database
npm run dev
```

### 3. AI Service

```bash
cd ai
python -m venv venv
venv\Scripts\activate       # or source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 4. Frontend Application

```bash
cd frontend
npm install
npm run dev
```

---

## Running Tests

```bash
cd server
npm run test
```

---

## Development Best Practices

- **Environment Variables:** Copy `.env.example` to `.env` in the `/server` directory and fill in your local credentials before running.
- **Testing:** Always run the test suite before submitting pull requests.
