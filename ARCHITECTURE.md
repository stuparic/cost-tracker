
# Cost Tracker - Architecture & Deployment

## Overview

Cost Tracker is a full-stack expense tracking application with a NestJS backend and Vue.js frontend.

**Backend:** NestJS API deployed to Google Cloud Run (serverless)
**Frontend:** Vue.js SPA deployed to Firebase Hosting
**Database:** Firebase Firestore
**CI/CD:** GitHub Actions (automated deployments)

---

## Table of Contents

- [Project Structure](#project-structure)
- [Backend Architecture](#backend-architecture)
  - [Deployment Flow](#backend-deployment-flow)
  - [GitHub Actions CI/CD](#backend-github-actions-cicd)
  - [Docker Multi-Stage Build](#docker-multi-stage-build)
  - [Critical Architecture Decision](#critical-architecture-decision)
  - [Security & Secrets](#security--secrets)
  - [Cost Controls](#cost-controls)
- [Frontend Architecture](#frontend-architecture)
  - [Deployment Flow](#frontend-deployment-flow)
  - [GitHub Actions CI/CD](#frontend-github-actions-cicd)
  - [Firebase Hosting Configuration](#firebase-hosting-configuration)
- [Technology Stack](#technology-stack)
- [Service URLs](#service-urls)
- [Monitoring](#monitoring)

---

## Project Structure

```
cost-tracker/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── expenses/          # Expense management
│   │   ├── autocomplete/      # Autocomplete suggestions
│   │   ├── currency/          # Currency conversion
│   │   ├── firebase/          # Firebase service
│   │   ├── health/            # Health check
│   │   └── main.ts            # Application entry
│   ├── test/
│   ├── dist/                  # Compiled JavaScript
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile             # Multi-stage build
│   └── .env
│
├── frontend/                   # Vue.js SPA
│   ├── src/
│   │   ├── components/
│   │   │   └── expense-form/  # Expense entry form
│   │   ├── api/               # API client layer
│   │   ├── stores/            # Pinia state management
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Helper functions
│   │   ├── App.vue
│   │   └── main.ts
│   ├── dist/                  # Build output
│   ├── package.json
│   ├── vite.config.ts
│   ├── firebase.json          # Hosting config
│   └── .firebaserc
│
└── .github/
    └── workflows/
        ├── deploy-cloud-run.yml    # Backend CI/CD
        └── deploy-frontend.yml     # Frontend CI/CD
```

---

## Backend Architecture

### Backend Deployment Flow

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

### Backend GitHub Actions CI/CD

#### Authentication

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

#### Workflow Steps

**File:** `.github/workflows/deploy-cloud-run.yml`

##### 1. Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

##### 2. Authenticate to Google Cloud
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
```

##### 3. Create Artifact Registry Repository
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

##### 4. Build and Push Docker Image
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

##### 5. Manage Firebase Secret
```yaml
- name: Create Firebase service account secret
  run: |
    echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}' > /tmp/service-account.json
    gcloud secrets create firebase-service-account --data-file=/tmp/service-account.json || true
    gcloud secrets versions add firebase-service-account --data-file=/tmp/service-account.json
    rm /tmp/service-account.json
```

##### 6. Grant Secret Access
```yaml
- name: Grant secret access to Cloud Run service account
  run: |
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
    gcloud secrets add-iam-policy-binding firebase-service-account \
      --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
      --role=roles/secretmanager.secretAccessor
```

##### 7. Deploy to Cloud Run
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

**Frontend Application:**
```
https://moneyflow-832f4.web.app
```

**Backend API:**
```
https://cost-tracker-1082828995983.europe-west1.run.app
```

**Swagger UI:**
```
https://cost-tracker-1082828995983.europe-west1.run.app/api
```

**Example API Calls:**
```bash
# Get all expenses
curl https://cost-tracker-1082828995983.europe-west1.run.app/api/v1/expenses

# Get expenses by category
curl https://cost-tracker-1082828995983.europe-west1.run.app/api/v1/expenses?category=Groceries

# Create expense
curl -X POST https://cost-tracker-1082828995983.europe-west1.run.app/api/v1/expenses \
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

**Backend Monitoring:**

View Backend Logs:
```
https://console.cloud.google.com/logs/query?project=moneyflow-832f4
```

View Cloud Run Service:
```
https://console.cloud.google.com/run/detail/europe-west1/cost-tracker?project=moneyflow-832f4
```

**Frontend Monitoring:**

View Firebase Hosting:
```
https://console.firebase.google.com/project/moneyflow-832f4/hosting
```

View Usage & Analytics:
```
https://console.firebase.google.com/project/moneyflow-832f4/analytics
```

**CI/CD Monitoring:**

View GitHub Actions (All Deployments):
```
https://github.com/stuparic/cost-tracker/actions
```

---

## Frontend Architecture

### Frontend Deployment Flow

```
┌─────────────────────────┐
│  Push to Master         │
│  (frontend/** changes)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  GitHub Actions         │
│  Triggered              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Install Dependencies   │
│  npm ci                 │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Build Vue App          │
│  vite build             │
│  - TypeScript compile   │
│  - Production mode      │
│  - Minification         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Deploy to Firebase     │
│  Hosting                │
│  - Upload dist/         │
│  - Update config        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Live! 🚀               │
│  moneyflow-832f4        │
│  .web.app               │
└─────────────────────────┘
```

---

### Frontend GitHub Actions CI/CD

**File:** `.github/workflows/deploy-frontend.yml`

#### Workflow Configuration

**Trigger:**
```yaml
on:
  push:
    branches:
      - master
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
```

**What it does:**
- Only deploys when frontend files change
- Skips deployment if only backend changes
- Efficient use of CI/CD minutes

---

#### Workflow Steps

##### 1. Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

##### 2. Setup Node.js
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'
    cache-dependency-path: frontend/package-lock.json
```

**Benefits:**
- Caches npm packages for faster builds
- Consistent Node.js version

##### 3. Install Dependencies
```yaml
- name: Install dependencies
  working-directory: ./frontend
  run: npm ci
```

**Why `npm ci`?**
- Faster than `npm install`
- Uses exact versions from package-lock.json
- Clean install (removes node_modules first)

##### 4. Build Vue Application
```yaml
- name: Build Vue app
  working-directory: ./frontend
  run: npm run build
  env:
    VITE_API_BASE_URL: https://cost-tracker-1082828995983.europe-west1.run.app/api/v1
    VITE_APP_TITLE: Cost Tracker
    VITE_ENABLE_LOGS: false
```

**Build Process:**
1. TypeScript compilation (`vue-tsc -b`)
2. Vite production build
3. Tree-shaking unused code
4. Minification and optimization
5. Output to `dist/` folder

**Environment Variables:**
- Production API URL (Cloud Run endpoint)
- App title
- Logging disabled in production

##### 5. Deploy to Firebase Hosting
```yaml
- name: Deploy to Firebase Hosting
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    repoToken: ${{ secrets.GITHUB_TOKEN }}
    firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    projectId: moneyflow-832f4
    channelId: live
    entryPoint: ./frontend
```

**What happens:**
1. Uploads `dist/` folder to Firebase
2. Updates hosting configuration
3. Invalidates CDN cache
4. Deploys to production

---

### Firebase Hosting Configuration

#### firebase.json

**File:** `frontend/firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**Key Configuration:**

1. **`"public": "dist"`**
   - Serves files from the build output directory

2. **Rewrites (SPA Routing):**
   - All routes redirect to `index.html`
   - Enables client-side routing (Vue Router)
   - No 404 errors on page refresh

3. **Cache Headers:**
   - JS/CSS files cached for 1 year
   - Vite uses content hashes in filenames
   - New builds automatically bust cache

4. **Ignore Files:**
   - Doesn't upload source files
   - Only uploads compiled assets

---

#### .firebaserc

**File:** `frontend/.firebaserc`

```json
{
  "projects": {
    "default": "moneyflow-832f4"
  }
}
```

**Purpose:**
- Links local project to Firebase project
- Used by Firebase CLI for deployments

---

### Frontend Technology Stack

**Framework:**
- Vue 3 (Composition API)
- TypeScript
- Vite (build tool)

**UI Library:**
- PrimeVue 4.x (component library)
- PrimeIcons (icon set)
- Aura theme (modern design)

**State Management:**
- Pinia (Vue store)

**HTTP Client:**
- Axios (with interceptors)

**Utilities:**
- date-fns (date formatting)

**Development:**
- Vite dev server (hot reload)
- Vue DevTools support
- TypeScript strict mode

---

### Frontend Features

#### 1. Minimal Input Form
- Only amount and shop name required
- Default currency: RSD
- Smart category inference from shop name
- Default payment method: Card

#### 2. Serbian Language
- All UI text in Serbian
- Labels: "Iznos", "Prodavnica", "Sačuvaj"
- Error messages in Serbian

#### 3. Category Inference
- Client-side pattern matching
- Real-time feedback as user types
- Confidence indicators (high/medium/low)
- Editable by user

#### 4. Quick Amount Buttons
- Preset amounts: 500, 1000, 2000, 5000 RSD
- One-click entry for common purchases

#### 5. Autocomplete
- Shop names from previous expenses
- Category suggestions
- Reduces typos and duplicates

#### 6. Mobile-First Design
- Responsive layout
- Touch-friendly buttons
- Works on phones and tablets

---

### Manual Deployment

**From Local Machine:**

```bash
cd frontend

# Build and deploy to production
npm run deploy

# Deploy to preview channel
npm run deploy:preview
```

**Requirements:**
- Firebase CLI installed (`npm install -g firebase-tools`)
- Authenticated (`firebase login`)
- Service account with Hosting permissions

---

## Technology Stack

**Backend:**
- **Runtime:** Node.js 18 (Alpine Linux)
- **Framework:** NestJS 9.x
- **Language:** TypeScript → JavaScript
- **Container:** Docker (multi-stage build)
- **Registry:** Google Artifact Registry
- **Hosting:** Google Cloud Run (serverless)

**Frontend:**
- **Framework:** Vue 3 + Composition API
- **Language:** TypeScript
- **UI Library:** PrimeVue 4.x
- **Build Tool:** Vite
- **Hosting:** Firebase Hosting
- **State:** Pinia

**Shared:**
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

**Last Updated:** 2026-01-11

**Live Application:**
- Frontend: https://moneyflow-832f4.web.app
- Backend API: https://cost-tracker-1082828995983.europe-west1.run.app
- Swagger: https://cost-tracker-1082828995983.europe-west1.run.app/api
