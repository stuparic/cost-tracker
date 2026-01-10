# Cost Tracker API

A NestJS-based REST API for tracking home expenses with dual currency support (EUR/RSD). Features automatic currency conversion, intelligent autocomplete, and Firebase Firestore integration.

## 🌐 Live Deployment

**API:** https://cost-tracker-utmayd66ga-ew.a.run.app
**Swagger UI:** https://cost-tracker-utmayd66ga-ew.a.run.app/api

## ✨ Features

- **Dual Currency Support** - Enter expenses in EUR or RSD, automatic conversion
- **Intelligent Autocomplete** - Learns from your entries (shops, products, categories, tags)
- **Fixed Exchange Rate** - 117.0 RSD per EUR (configurable)
- **Firebase Firestore** - Cloud-native NoSQL database
- **Swagger Documentation** - Interactive API explorer
- **Automatic Deployment** - Push to master → Live in 5 minutes
- **Zero Cost** - Free tier with strict cost controls (max 1 instance)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- Firebase service account key (`serviceAccountKey.json`)

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set your Firebase project ID

# Run in development mode
npm run start:dev

# API available at http://localhost:3000
# Swagger UI at http://localhost:3000/api
```

### Environment Variables

```env
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIXED_EUR_TO_RSD_RATE=117.0
PORT=3000
NODE_ENV=development
```

## 📖 API Examples

### Create Expense

```bash
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

### Get All Expenses

```bash
curl https://cost-tracker-utmayd66ga-ew.a.run.app/expenses
```

### Filter by Category

```bash
curl https://cost-tracker-utmayd66ga-ew.a.run.app/expenses?category=Groceries
```

### Get Autocomplete Suggestions

```bash
# Shop names
curl https://cost-tracker-utmayd66ga-ew.a.run.app/autocomplete/shops?search=max

# Product descriptions
curl https://cost-tracker-utmayd66ga-ew.a.run.app/autocomplete/products?search=milk

# Categories
curl https://cost-tracker-utmayd66ga-ew.a.run.app/autocomplete/categories

# Tags
curl https://cost-tracker-utmayd66ga-ew.a.run.app/autocomplete/tags
```

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Cloud Run         │
│   (NestJS API)      │
├─────────────────────┤
│ • Expenses Module   │
│ • Autocomplete      │
│ • Currency Service  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Firebase Firestore  │
│ (expenses)          │
└─────────────────────┘
```

## 📦 Project Structure

```
src/
├── autocomplete/       # Intelligent suggestions from history
├── config/            # Configuration (Firebase, etc.)
├── currency/          # EUR/RSD conversion logic
├── expenses/          # Core expense tracking module
│   ├── dto/          # Data transfer objects
│   └── interfaces/   # TypeScript interfaces
└── firebase/          # Firebase/Firestore connection

.github/
└── workflows/         # CI/CD pipeline (GitHub Actions)

Dockerfile             # Multi-stage production build
```

## 🛠️ Available Scripts

```bash
# Development
npm run start:dev      # Watch mode with hot reload

# Production
npm run build          # Build for production
npm run start:prod     # Run production build

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run test:cov       # Generate coverage report

# Linting
npm run lint           # Lint and auto-fix
npm run format         # Format code with Prettier
```

## 🚢 Deployment

Automatic deployment via GitHub Actions on push to `master` branch.

**See detailed deployment docs:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Quick start deployment guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Comprehensive architecture documentation

### Manual Deployment

```bash
# Deploy happens automatically on git push
git add .
git commit -m "Your changes"
git push origin master

# View deployment status
# https://github.com/stuparic/cost-tracker/actions
```

## 🔐 Security

- Service account authentication for GitHub Actions
- Firebase credentials stored in Google Secret Manager
- Secrets mounted at runtime (not in image)
- HTTPS-only (enforced by Cloud Run)
- Input validation with class-validator
- No billing charges possible (max-instances=1, min-instances=0)

## 📊 Monitoring

**Cloud Run Logs:**
https://console.cloud.google.com/logs/query?project=moneyflow-832f4

**Service Metrics:**
https://console.cloud.google.com/run/detail/europe-west1/cost-tracker?project=moneyflow-832f4

**GitHub Actions:**
https://github.com/stuparic/cost-tracker/actions

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (requires Firestore emulator)
npm run test:e2e

# Coverage
npm run test:cov
```

## 📝 API Documentation

Interactive Swagger documentation available at:
**https://cost-tracker-utmayd66ga-ew.a.run.app/api**

All endpoints include:
- Request/response schemas
- Validation rules
- Example payloads
- Try-it-out functionality

## 🔧 Technology Stack

- **Runtime:** Node.js 18 (Alpine Linux)
- **Framework:** NestJS 10.x
- **Language:** TypeScript
- **Database:** Firebase Firestore
- **Validation:** class-validator + class-transformer
- **Documentation:** Swagger/OpenAPI
- **Hosting:** Google Cloud Run (serverless)
- **CI/CD:** GitHub Actions
- **Container:** Docker (multi-stage build)

## 💰 Cost Structure

**Configured for ZERO cost:**
- `min-instances: 0` - Scales to zero when idle
- `max-instances: 1` - Prevents scaling charges
- Cloud Run free tier: 2M requests/month
- Firestore free tier: 50K reads/day
- **Result:** Impossible to incur charges

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass: `npm test`
4. Ensure build succeeds: `npm run build`
5. Push and create a pull request

## 📄 License

UNLICENSED - Private project

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture & deployment flow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment quick start guide
- [NestJS Documentation](https://docs.nestjs.com)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Google Cloud Run](https://cloud.google.com/run/docs)

---

**Deployed:** 2026-01-10
**Version:** 1.0.0
**Status:** ✅ Live
