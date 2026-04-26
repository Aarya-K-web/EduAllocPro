# EduAllocPro — School Intelligence & Teacher Deployment Platform

> AI-powered UDISE+ and HRMS bridge for equitable teacher deployment in Maharashtra government schools.

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8)](https://tailwindcss.com)
[![OR-Tools](https://img.shields.io/badge/OR--Tools-9.10-orange)](https://developers.google.com/optimization)
[![Hackathon](https://img.shields.io/badge/Hack2Skill-Build%20with%20AI%202026-purple)](https://hack2skill.com)

---

## Overview

EduAllocPro computes a **Deprivation Index (DI)** for every government school in a district using 8 UDISE+ signals, then uses **Vertex AI embeddings** to match teachers to vacancies, and **OR-Tools CP-SAT** to optimise district-wide deployment — all surfaced through a bilingual (English + Marathi) React dashboard.

**Pilot district:** Nandurbar, Maharashtra — real UDISE+ data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 18 + Vite                          │
│  Dashboard (60/40 map) │ Deploy │ Plan │ Briefing │ BEO Mobile  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / Firebase JWT
┌──────────────────────────────▼──────────────────────────────────┐
│                    FastAPI (Cloud Run)                           │
│  /api/schools  /api/deploy/matches  /api/deploy/optimize        │
│  /api/briefing  /api/briefing/order  /api/health                │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
  BigQuery      Vertex AI       Gemini 1.5     Google Maps
  (UDISE+)   (Embeddings)        (Pro)       (Distance Matrix)
  schools      teacher-school   Briefings    Commute calc
  teachers     matching         Orders
  deployments
```

---

## Prerequisites

- **GCP account** with billing enabled
- **Node.js 18+** and npm
- **Python 3.11+**
- **Docker** (for local compose)
- APIs to enable in Cloud Console:
  - BigQuery API
  - Vertex AI API
  - Generative Language API (Gemini)
  - Maps JavaScript API
  - Distance Matrix API
  - Geocoding API
  - Cloud Translation API
  - Firebase Authentication

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/edualloc-pro.git
cd edualloc-pro
```

### 2. GCP Setup

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable bigquery.googleapis.com \
  aiplatform.googleapis.com \
  generativelanguage.googleapis.com \
  maps-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  translate.googleapis.com \
  firebase.googleapis.com

# Create BigQuery dataset
bq mk --dataset --location=us-central1 YOUR_PROJECT_ID:edualloc_dataset

# Create service account
gcloud iam service-accounts create edualloc-sa \
  --display-name="EduAllocPro Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:edualloc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

# Download key
gcloud iam service-accounts keys create secrets/service-account.json \
  --iam-account=edualloc-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — fill in GOOGLE_CLOUD_PROJECT, GOOGLE_API_KEY, MAPS_API_KEY, FIREBASE_PROJECT_ID

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env — fill in VITE_MAPS_API_KEY, VITE_FIREBASE_* keys

# Docker Compose (root)
cp backend/.env.example .env
# Edit .env — fill in BACKEND_* and FRONTEND_* prefixed vars
```

### 4. Load data (first time only)

```bash
cd backend
pip install -r requirements.txt

# Download UDISE+ CSV for Nandurbar from udiseplus.gov.in
# Place at: backend/data/sample/udise_nandurbar.csv

# Run full setup pipeline
python data/setup_bq.py
```

### 5. Local development

```bash
# Option A: Docker Compose (recommended)
docker-compose up

# Option B: Manual
# Terminal 1 — Backend
cd backend
uvicorn api.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — use demo accounts:
- `collector@nandurbar.gov.in` / `demo1234` → District Collector view
- `beo@nandurbar.gov.in` / `demo1234` → BEO mobile view (Marathi)

---

## API Documentation

Interactive Swagger UI: **http://localhost:8000/api/docs**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Liveness probe |
| GET | `/api/schools` | Officer | List schools by DI score |
| GET | `/api/schools/{id}` | Officer | School detail + DI breakdown |
| GET | `/api/teachers` | Officer | List teachers |
| GET | `/api/deploy/matches` | Officer | Top-5 teacher matches (DVS) |
| POST | `/api/deploy/optimize` | Collector | OR-Tools district optimizer |
| GET | `/api/briefing` | Officer | Gemini weekly briefing |
| POST | `/api/briefing/order` | Officer | Generate deployment order PDF |

---

## Running Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v --cov=. --cov-report=term-missing
```

---

## Deployment

```bash
# Deploy backend to Cloud Run + frontend to Vercel
chmod +x deploy.sh
./deploy.sh YOUR_PROJECT_ID
```

Cloud Run requirements (enforced in deploy.sh):
- `--min-instances 1` — prevents cold start during demo
- `--memory 2Gi` — OR-Tools + embeddings cache
- `--timeout 120` — OR-Tools 20s + Gemini 15s + buffer
- `--concurrency 10` — single worker, shared state

---

## Live URLs

- **Frontend (Vercel):** https://edualloc-pro.vercel.app *(placeholder)*
- **Backend (Cloud Run):** https://edualloc-api-xyz.run.app *(placeholder)*
- **Demo video:** *(placeholder)*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Maps | @react-google-maps/api, Google Maps JS API |
| Charts | Recharts (enrollment sparklines) |
| i18n | react-i18next (English + Marathi) |
| PDF | @react-pdf/renderer (client), ReportLab (server) |
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI | Vertex AI textembedding-gecko@003, Gemini 1.5 Pro |
| Optimizer | Google OR-Tools CP-SAT |
| Database | Google BigQuery (UDISE+ data) |
| Auth | Firebase Authentication |
| Deploy | Cloud Run (backend), Vercel (frontend) |

---

## Hackathon Submission

**Event:** Build with AI — Hack2Skill 2026
**Domain:** Smart Resource Allocation
**Team:** EduAllocPro
**Pilot:** Nandurbar District, Maharashtra

*EduAllocPro — Bridging the 75-year institutional data gap in Maharashtra school education.*
