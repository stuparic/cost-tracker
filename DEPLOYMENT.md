# Quick Deployment Guide

This guide helps you deploy the Cost Tracker API to Google Cloud Run with automatic CI/CD.

**For detailed architecture and how everything works, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

---

## 🎯 What You'll Get

- ✅ Automatic deployments on `git push`
- ✅ **Zero cost** - Free tier with strict limits (max 1 instance)
- ✅ HTTPS endpoint with custom domain support
- ✅ Secrets managed securely (Google Secret Manager)
- ✅ Production-ready Docker container
- ✅ Live in ~5 minutes per deployment

---

## 📋 Prerequisites

Before starting, you need:

1. **Google Cloud Account** (free tier, no credit card required)
2. **GitHub Repository** (this repo)
3. **Firebase Project** with Firestore enabled
4. **Firebase Service Account Key** (`serviceAccountKey.json`)

---

## 🚀 Deployment Steps

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. **Note your Project ID** (e.g., `moneyflow-832f4`)

### Step 2: Enable Required APIs

Go to [APIs Library](https://console.cloud.google.com/apis/library) and enable:

- ✅ Cloud Run API
- ✅ Cloud Build API
- ✅ Artifact Registry API
- ✅ Secret Manager API

### Step 3: Create Service Account

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"Create Service Account"**
3. Name: `github-actions-deployer`
4. Grant these roles:
   - `Cloud Run Admin`
   - `Service Account User`
   - `Storage Admin`
   - `Secret Manager Admin`
   - `Artifact Registry Administrator`
5. Click **"Keys" tab > "Add Key" > "Create new key" > "JSON"**
6. **Save the downloaded JSON file** (you'll need it for GitHub)

### Step 4: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create costtracker \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker repository for Cost Tracker" \
  --project=YOUR_PROJECT_ID
```

Or create manually in the [Artifact Registry Console](https://console.cloud.google.com/artifacts).

### Step 5: Configure GitHub Secrets

1. Go to your GitHub repo: **Settings > Secrets and variables > Actions**
2. Click **"New repository secret"** and add:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `GCP_PROJECT_ID` | Your project ID | Google Cloud Console |
| `GCP_SA_KEY` | Service account JSON | File from Step 3 (entire contents) |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase credentials | `serviceAccountKey.json` (entire contents) |

**Example for `GCP_SA_KEY`:**
```json
{
  "type": "service_account",
  "project_id": "moneyflow-832f4",
  "private_key_id": "...",
  "private_key": "...",
  ...
}
```

### Step 6: Deploy!

```bash
git add .
git commit -m "Initial deployment"
git push origin master
```

**That's it!** GitHub Actions will:
1. Build Docker image
2. Push to Artifact Registry
3. Deploy to Cloud Run
4. Take ~5 minutes

Watch deployment: https://github.com/YOUR_USERNAME/cost-tracker/actions

---

## 🌐 Access Your API

After deployment completes:

**Service URL:**
```
https://cost-tracker-xxx.run.app
```

**Swagger Documentation:**
```
https://cost-tracker-xxx.run.app/api
```

Find your URL in:
- GitHub Actions logs (last step)
- [Cloud Run Console](https://console.cloud.google.com/run)

---

## 🔧 Common Tasks

### View Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cost-tracker" \
  --limit 50 \
  --project=YOUR_PROJECT_ID
```

Or in [Cloud Run Console](https://console.cloud.google.com/run) > Select service > Logs

### Update Environment Variable

```bash
gcloud run services update cost-tracker \
  --region europe-west1 \
  --set-env-vars NEW_VAR=value \
  --project=YOUR_PROJECT_ID
```

### Redeploy

Just push to master:
```bash
git push origin master
```

### Pause Service (Scale to Zero)

```bash
gcloud run services update cost-tracker \
  --region europe-west1 \
  --max-instances 0 \
  --project=YOUR_PROJECT_ID
```

### Resume Service

```bash
gcloud run services update cost-tracker \
  --region europe-west1 \
  --max-instances 1 \
  --project=YOUR_PROJECT_ID
```

---

## ⚠️ Troubleshooting

### Deployment Fails with "Permission Denied"

**Issue:** Service account doesn't have required permissions

**Fix:** Re-check roles in Step 3, ensure all 5 roles are added

### "Repository not found" Error

**Issue:** Artifact Registry repository doesn't exist

**Fix:** Run Step 4 to create the repository

### Firebase Connection Fails

**Issue:** `FIREBASE_SERVICE_ACCOUNT` secret is incorrect

**Fix:**
1. Verify the secret contains the entire JSON file
2. No extra quotes or formatting
3. Check in Cloud Run logs for specific error

### Can't Find Service URL

**Issue:** Deployment succeeded but can't access

**Fix:**
1. Check GitHub Actions logs for URL
2. Go to [Cloud Run Console](https://console.cloud.google.com/run)
3. Click on `cost-tracker` service
4. URL is at the top

---

## 📚 Next Steps

**Learn more about the architecture:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - How everything works together
- [README.md](./README.md) - API usage and examples

**Customize your deployment:**
- Change region: Edit `.github/workflows/deploy-cloud-run.yml`
- Update resources: Change `--memory` and `--cpu` flags
- Add custom domain: Cloud Run Console > Manage Custom Domains

**Monitor your service:**
- [Cloud Run Console](https://console.cloud.google.com/run) - Service metrics
- [Logs Explorer](https://console.cloud.google.com/logs) - Application logs
- [GitHub Actions](https://github.com/YOUR_USERNAME/cost-tracker/actions) - Deployment history

---

## 💰 Cost Guarantee

**This deployment is configured to NEVER charge you:**

```yaml
--min-instances 0  # Scales to zero when idle
--max-instances 1  # Only 1 instance maximum
```

**What this means:**
- Service stops when not in use (0 cost)
- Cannot scale beyond 1 instance (prevents charges)
- If you exceed free tier, service simply stops
- **Impossible to get billed**

**Free Tier Limits:**
- 2 million requests/month
- 360,000 GB-seconds/month
- 180,000 vCPU-seconds/month

---

## 🎉 You're Done!

Your API is now:
- ✅ Live and accessible
- ✅ Automatically deployed on push
- ✅ Cost-protected (free tier)
- ✅ Documented with Swagger
- ✅ Production-ready

**Test it:**
```bash
curl https://YOUR_SERVICE_URL/health
```

**Explore the API:**
```
https://YOUR_SERVICE_URL/api
```

---

**Questions?** Check [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed explanations.
