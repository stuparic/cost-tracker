
# Cost Tracker - Deployment Architecture

## Overview

This document explains how the Cost Tracker API is deployed to Google Cloud Run using GitHub Actions and Docker.

---

## Table of Contents

- [Deployment Flow](#deployment-flow)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Docker Multi-Stage Build](#docker-multi-stage-build)
- [Critical Architecture Decision](#critical-architecture-decision)
- [Security & Secrets](#security--secrets)
- [Cost Controls](#cost-controls)

---

## Deployment Flow

```
┌─────────────────┐
│  Push to Master │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  GitHub Actions Triggered   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Authenticate with GCP      │
│  (Service Account Key)      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Build Docker Image         │
│  (Multi-stage build)        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Push to Artifact Registry  │
│  europe-west1               │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Deploy to Cloud Run        │
│  - Mount Firebase secret    │
│  - Set environment vars     │
│  - Configure scaling        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Service Live! 🚀           │
│  cost-tracker-xxx.run.app   │
└─────────────────────────────┘
```

---

## GitHub Actions CI/CD

### Authentication

**Service Account Setup:**
```
github-actions-deployer@moneyflow-832f4.iam.gserviceaccount.com
```

**Roles Assigned:**
- `Cloud Run Admin` - Deploy and manage Cloud Run services
- `Service Account User` - Use service accounts for deployment
- `Storage Admin` - Push images to Artifact Registry
- `Secret Manager Admin` - Manage Firebase secrets
- `Artifact Registry Administrator` - Create and manage repositories

**How Authentication Works:**

1. Service account JSON key stored in GitHub Secrets: `GCP_SA_KEY`
2. GitHub Actions uses this key to authenticate:
   ```yaml
   - name: Authenticate to Google Cloud
     uses: google-github-actions/auth@v2
     with:
       credentials_json: ${{ secrets.GCP_SA_KEY }}
   ```
3. All subsequent `gcloud` commands run with these permissions

---

### Workflow Steps

**File:** `.github/workflows/deploy-cloud-run.yml`

#### 1. Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

#### 2. Authenticate to Google Cloud
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
```

#### 3. Create Artifact Registry Repository
```yaml
- name: Create Artifact Registry repository
  run: |
    if ! gcloud artifacts repositories describe costtracker --location=europe-west1 --project=$PROJECT_ID &>/dev/null; then
      gcloud artifacts repositories create costtracker \
        --repository-format=docker \
        --location=europe-west1 \
        --project=$PROJECT_ID
    fi
```

#### 4. Build and Push Docker Image
```yaml
- name: Build Docker image
  run: |
    docker build -t $IMAGE:${{ github.sha }} .
    docker tag $IMAGE:${{ github.sha }} $IMAGE:latest

- name: Push Docker image
  run: |
    docker push $IMAGE:${{ github.sha }}
    docker push $IMAGE:latest
```

**Image Location:**
```
europe-west1-docker.pkg.dev/moneyflow-832f4/costtracker/cost-tracker:latest
```

#### 5. Manage Firebase Secret
```yaml
- name: Create Firebase service account secret
  run: |
    echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}' > /tmp/service-account.json
    gcloud secrets create firebase-service-account --data-file=/tmp/service-account.json || true
    gcloud secrets versions add firebase-service-account --data-file=/tmp/service-account.json
    rm /tmp/service-account.json
```

#### 6. Grant Secret Access
```yaml
- name: Grant secret access to Cloud Run service account
  run: |
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
    gcloud secrets add-iam-policy-binding firebase-service-account \
      --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
      --role=roles/secretmanager.secretAccessor
```

#### 7. Deploy to Cloud Run
```yaml
- name: Deploy to Cloud Run
  run: |
    gcloud run deploy cost-tracker \
      --image $IMAGE:${{ github.sha }} \
      --platform managed \
      --region europe-west1 \
      --allow-unauthenticated \
      --set-env-vars FIREBASE_PROJECT_ID=${{ secrets.FIREBASE_PROJECT_ID }} \
      --set-env-vars FIXED_EUR_TO_RSD_RATE=117.0 \
      --set-env-vars NODE_ENV=production \
      --update-secrets=/secrets/serviceAccountKey.json=firebase-service-account:latest \
      --min-instances 0 \
      --max-instances 1 \
      --memory 512Mi \
      --cpu 1 \
      --timeout 300
```

---

## Docker Multi-Stage Build

### Why Multi-Stage?

**Benefits:**
- ✅ Smaller production image (~200MB vs ~500MB)
- ✅ Faster deployments
- ✅ More secure (no dev tools in production)
- ✅ Lower memory usage
- ✅ Only necessary files in final image

---

### Stage 1: Builder

**Purpose:** Build TypeScript code into JavaScript

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including dev dependencies like TypeScript)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build: TypeScript → JavaScript (output to /app/dist)
RUN npm run build
```

**What happens:**
- Installs 833 packages (including `typescript`, `@nestjs/cli`, etc.)
- Compiles `.ts` files to `.js` files in `/app/dist`
- Creates a ~500MB intermediate image (discarded after build)

---

### Stage 2: Production

**Purpose:** Create minimal runtime image

```dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy ONLY the compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 8080

# Start the application
CMD ["node", "dist/main.js"]
```

**What happens:**
- Installs only 341 packages (no TypeScript, no build tools)
- Copies only compiled JavaScript files (not source `.ts` files)
- Creates a ~200MB final image
- Only contains what's needed to run the app

---

### Build Process Visualization

```
┌─────────────────────────────────────┐
│  Stage 1: Builder                   │
│  ─────────────────────────────────  │
│  • Node.js 18 Alpine                │
│  • All dependencies (dev + prod)    │
│  • TypeScript source code           │
│  • Compiled JavaScript in /app/dist │
│  Size: ~500MB                       │
└─────────────┬───────────────────────┘
              │
              │ Copy only /app/dist
              │
              ▼
┌─────────────────────────────────────┐
│  Stage 2: Production                │
│  ─────────────────────────────────  │
│  • Node.js 18 Alpine                │
│  • Production dependencies only     │
│  • Compiled JavaScript only         │
│  Size: ~200MB                       │
└─────────────────────────────────────┘
              │
              │ Push to registry
              │
              ▼
        Artifact Registry
```

---

## Critical Architecture Decision

### The `/app` Directory Problem

**Initial Implementation (BROKEN):**

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app  # ❌ Problem!

COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
```

```yaml
# Cloud Run deployment
--update-secrets=/app/serviceAccountKey.json=firebase-service-account:latest
```

**What went wrong:**

1. Application files placed in: `/app/`
2. Cloud Run mounts secret at: `/app/serviceAccountKey.json`
3. **Volume mount overlays entire `/app` directory!**
4. Result: All application files hidden/inaccessible
5. Error: `Cannot find module '/app/dist/main.js'`

**Debugging process:**

```dockerfile
# Build logs showed files existed:
RUN ls -la /app/dist
# Output: main.js exists! ✓

# Runtime logs showed files missing:
Error: Cannot find module '/app/dist/main.js'
# Why? Volume mount overlay! ✗
```

---

### The Solution

**Fixed Implementation:**

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app  # ✅ Different directory

COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
```

```yaml
# Cloud Run deployment
--update-secrets=/secrets/serviceAccountKey.json=firebase-service-account:latest
```

**Directory Layout:**

```
/usr/src/app/              # Application files
├── dist/
│   └── main.js           # Entry point
├── node_modules/         # Production dependencies
└── package.json

/secrets/                  # Secrets volume mount (separate!)
└── serviceAccountKey.json # Firebase credentials
```

**Result:** ✅ No conflicts, app starts successfully!

---

## Security & Secrets

### GitHub Secrets

Stored in: `Repository Settings > Secrets and variables > Actions`

```
GCP_PROJECT_ID           = moneyflow-832f4
GCP_SA_KEY              = { ... service account JSON ... }
FIREBASE_PROJECT_ID      = moneyflow-832f4
FIREBASE_SERVICE_ACCOUNT = { ... firebase credentials ... }
```

### Google Cloud Secret Manager

**Secret:** `firebase-service-account`

- Stores Firebase service account credentials
- Versioned (new version created on each deployment)
- Mounted as file at runtime: `/secrets/serviceAccountKey.json`
- Access granted to Cloud Run service account

**Access Control:**

```bash
# Service account that needs access
514960567351-compute@developer.gserviceaccount.com

# Permission granted
roles/secretmanager.secretAccessor
```

### Environment Variables

Set at runtime on Cloud Run:

```yaml
FIREBASE_PROJECT_ID = moneyflow-832f4
FIXED_EUR_TO_RSD_RATE = 117.0
NODE_ENV = production
PORT = 8080  # Auto-set by Cloud Run
```

Access in code:

```typescript
// src/config/firebase.config.ts
export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentialsPath:
    process.env.NODE_ENV === 'production'
      ? '/secrets/serviceAccountKey.json'  // Cloud Run
      : './serviceAccountKey.json',         // Local dev
}));
```

---

## Cost Controls

### Zero-Cost Configuration

**Scaling Limits:**
```yaml
--min-instances 0  # Scales to zero when idle (no cost)
--max-instances 1  # Maximum 1 instance (prevents runaway costs)
```

**Resource Limits:**
```yaml
--memory 512Mi     # 512 MB RAM
--cpu 1            # 1 vCPU
--timeout 300      # 5 minute timeout
```

**Access:**
```yaml
--allow-unauthenticated  # Public access (no authentication required)
```

### What This Means

✅ **Free Tier Protection:**
- Service scales to zero when not in use (0 cost)
- Maximum 1 instance prevents scaling charges
- If free tier exceeded, service simply stops
- **Impossible to incur charges**

✅ **Usage Limits:**
- 2 million requests/month (free)
- 360,000 GB-seconds/month (free)
- 180,000 vCPU-seconds/month (free)

---

## Service URLs

**Main Service:**
```
https://cost-tracker-utmayd66ga-ew.a.run.app
```

**Swagger UI:**
```
https://cost-tracker-utmayd66ga-ew.a.run.app/api
```

**Example API Calls:**
```bash
# Get all expenses
curl https://cost-tracker-utmayd66ga-ew.a.run.app/expenses

# Get expenses by category
curl https://cost-tracker-utmayd66ga-ew.a.run.app/expenses?category=Groceries

# Create expense
curl -X POST https://cost-tracker-utmayd66ga-ew.a.run.app/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "currency": "EUR",
    "shopName": "Maxi",
    "productDescription": "Weekly groceries",
    "category": "Groceries",
    "paymentMethod": "Card",
    "tags": ["food", "weekly"],
    "purchaseDate": "2026-01-10"
  }'
```

---

## Monitoring

**View Logs:**
```
https://console.cloud.google.com/logs/query?project=moneyflow-832f4
```

**View Service:**
```
https://console.cloud.google.com/run/detail/europe-west1/cost-tracker?project=moneyflow-832f4
```

**View Deployments:**
```
https://github.com/stuparic/cost-tracker/actions
```

---

## Technology Stack

- **Runtime:** Node.js 18 (Alpine Linux)
- **Framework:** NestJS 9.x
- **Language:** TypeScript → JavaScript
- **Container:** Docker (multi-stage build)
- **Registry:** Google Artifact Registry
- **Hosting:** Google Cloud Run (serverless)
- **Database:** Firebase Firestore
- **CI/CD:** GitHub Actions
- **Secrets:** Google Secret Manager

---

## Key Learnings

### 1. Volume Mounts Override Directories
**Problem:** Mounting a secret in `/app` hid all application files
**Solution:** Use separate directories (`/usr/src/app` vs `/secrets`)

### 2. Multi-Stage Builds Save Resources
**Benefit:** 60% smaller image, faster cold starts, lower memory usage

### 3. Service Accounts for Automation
**Benefit:** Secure, auditable deployments without personal credentials

### 4. Automatic Deployments
**Benefit:** Push to master → Live in 5 minutes (zero manual steps)

### 5. Cost Controls are Critical
**Implementation:** max-instances=1, min-instances=0 = zero risk

---

## Quick Reference

### Redeploy Manually
```bash
git push origin master
# Wait 5 minutes, service auto-deploys
```

### View Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cost-tracker" \
  --limit 50 \
  --project=moneyflow-832f4
```

### Update Environment Variable
```bash
gcloud run services update cost-tracker \
  --region europe-west1 \
  --set-env-vars NEW_VAR=value \
  --project=moneyflow-832f4
```

### Scale to Zero (Pause Service)
```bash
gcloud run services update cost-tracker \
  --region europe-west1 \
  --max-instances 0 \
  --project=moneyflow-832f4
```

### Resume Service
```bash
gcloud run services update cost-tracker \
  --region europe-west1 \
  --max-instances 1 \
  --project=moneyflow-832f4
```

---

**Last Updated:** 2026-01-10
**Deployed Version:** https://cost-tracker-utmayd66ga-ew.a.run.app
