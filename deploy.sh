#!/bin/bash
# EduAllocPro — Cloud Run + Vercel Deployment Script
# Usage: ./deploy.sh [PROJECT_ID]
set -e

PROJECT_ID=${1:-$GOOGLE_CLOUD_PROJECT}

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: PROJECT_ID required. Usage: ./deploy.sh YOUR_PROJECT_ID"
  exit 1
fi

echo "Deploying EduAllocPro to project: $PROJECT_ID"

# ── Backend: Cloud Run ────────────────────────────────────────────────────────
echo "Building backend image..."
gcloud builds submit backend/ --tag gcr.io/$PROJECT_ID/edualloc-api --project $PROJECT_ID

echo "Deploying to Cloud Run..."
gcloud run deploy edualloc-api \
  --image gcr.io/$PROJECT_ID/edualloc-api \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 3 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 120 \
  --concurrency 10 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --set-env-vars BQ_DATASET=edualloc_dataset \
  --set-env-vars APP_ENV=production \
  --set-env-vars WORKERS=1 \
  --set-env-vars FIREBASE_PROJECT_ID=$PROJECT_ID \
  --set-secrets GOOGLE_API_KEY=gemini-api-key:latest \
  --set-secrets MAPS_API_KEY=maps-api-key:latest \
  --allow-unauthenticated \
  --project $PROJECT_ID

BACKEND_URL=$(gcloud run services describe edualloc-api --region us-central1 --format 'value(status.url)' --project $PROJECT_ID)
echo "Backend deployed: $BACKEND_URL"

# ── Frontend: Vercel ──────────────────────────────────────────────────────────
echo "Deploying frontend to Vercel..."
cd frontend
vercel env add VITE_API_URL production <<< "$BACKEND_URL" 2>/dev/null || true
vercel --prod
cd ..

echo ""
echo "Deployment complete!"
echo "Backend:  $BACKEND_URL"
echo "Frontend: Check Vercel dashboard for URL"
echo ""
echo "Health check: curl $BACKEND_URL/api/health"
