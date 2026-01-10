# Deployment to Google Cloud Run

This guide will help you deploy your Cost Tracker API to Google Cloud Run for **FREE** with automatic deployments via GitHub Actions.

## ⚠️ IMPORTANT: Cost Protection

**This deployment is configured with STRICT cost controls to ensure you NEVER get charged.**

**Built-in protections:**
- ✅ Scales to zero when not in use (no idle costs)
- ✅ Max 3 instances (prevents runaway scaling)
- ✅ 256Mi memory limit (optimal for free tier)
- ✅ Budget alerts at $0.01
- ✅ Automatic email notifications

**After deployment, run the cost control setup:**
```bash
export PROJECT_ID=your-project-id
./setup-cost-controls.sh
```

📖 **Read COST-CONTROLS.md for complete details on staying within free tier.**

---

## Prerequisites

- Google Cloud account (free tier)
- GitHub repository
- Firebase project already set up (✅ you have this)

## Cost Overview

**Google Cloud Run Free Tier (per month):**
- 2 million requests
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds of compute time
- **With our config: Handles ~500K-1.5M requests/month FREE**

---

## Step 1: Set Up Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a new project or use existing**:
   - Click on the project dropdown at the top
   - Click "New Project"
   - Name it: `cost-tracker` (or any name you prefer)
   - Note: You can use the same project as your Firebase project

3. **Enable Required APIs**:
   - Go to: https://console.cloud.google.com/apis/library
   - Enable these APIs:
     - **Cloud Run API**
     - **Cloud Build API**
     - **Container Registry API**
     - **Secret Manager API**

4. **Get your Project ID**:
   - Go to: https://console.cloud.google.com/home/dashboard
   - Copy your **Project ID** (not the name, the ID)
   - Example: `moneyflow-832f4`

---

## Step 2: Create Service Account for GitHub Actions

1. **Go to IAM & Admin > Service Accounts**:
   - https://console.cloud.google.com/iam-admin/serviceaccounts

2. **Create Service Account**:
   - Click "Create Service Account"
   - Name: `github-actions-deployer`
   - Description: "Service account for GitHub Actions to deploy to Cloud Run"
   - Click "Create and Continue"

3. **Grant Roles** (add these roles one by one):
   - `Cloud Run Admin`
   - `Service Account User`
   - `Storage Admin`
   - `Secret Manager Admin`
   - Click "Continue" then "Done"

4. **Create JSON Key**:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON"
   - Click "Create" - a JSON file will download
   - **Keep this file secure!** You'll use it in the next step

---

## Step 3: Configure GitHub Secrets

1. **Go to your GitHub repository**: https://github.com/stuparic/cost-tracker

2. **Navigate to Settings > Secrets and variables > Actions**

3. **Add the following Repository Secrets** (click "New repository secret"):

   **a) `GCP_PROJECT_ID`**
   - Value: Your Google Cloud Project ID (e.g., `moneyflow-832f4`)

   **b) `GCP_SA_KEY`**
   - Value: Entire contents of the JSON key file you downloaded in Step 2
   - Open the JSON file in a text editor, copy ALL the content
   - Paste it as the secret value

   **c) `FIREBASE_PROJECT_ID`**
   - Value: Your Firebase project ID (e.g., `moneyflow-832f4`)

   **d) `FIREBASE_SERVICE_ACCOUNT`**
   - Value: Contents of your `serviceAccountKey.json` file
   - This is the same file currently in your project root
   - Open it in a text editor, copy ALL the content
   - Paste it as the secret value

---

## Step 4: Update Firebase Service Configuration

Your app currently uses a local file path for Firebase credentials. For Cloud Run, we'll use Google Secret Manager.

**Update `src/config/firebase.config.ts`**:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  // In production, Cloud Run will mount the secret as a file
  // In development, use the local file
  credentialsPath:
    process.env.NODE_ENV === 'production'
      ? '/app/serviceAccountKey.json'
      : process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json',
}));
```

---

## Step 5: Deploy!

Once you've completed steps 1-4:

1. **Commit and push your changes**:
   ```bash
   git add .
   git commit -m "Add Cloud Run deployment configuration"
   git push origin master
   ```

2. **Watch the deployment**:
   - Go to: https://github.com/stuparic/cost-tracker/actions
   - You'll see the "Deploy to Cloud Run" workflow running
   - It takes about 5-10 minutes for the first deployment

3. **Get your deployed URL**:
   - When the workflow completes, check the logs
   - Look for the line: "Service deployed to: https://cost-tracker-xxx.run.app"
   - Copy this URL!

4. **Test your API**:
   - Visit: `https://your-service-url.run.app/api` for Swagger UI
   - Try creating an expense via the API

---

## Step 6: Verify Everything Works

1. **Check Cloud Run Console**:
   - Go to: https://console.cloud.google.com/run
   - You should see your `cost-tracker` service
   - Click on it to see metrics, logs, etc.

2. **View Logs**:
   - In the Cloud Run console, click on "Logs"
   - You'll see all your application logs, including Firebase initialization

3. **Test the API**:
   ```bash
   # Replace with your actual URL
   curl https://cost-tracker-xxx.run.app/expenses
   ```

---

## Automatic Deployments

Every time you push to the `master` branch, GitHub Actions will automatically:

1. Build a new Docker image
2. Push it to Google Container Registry
3. Deploy it to Cloud Run
4. Your app will be live in ~5 minutes

---

## Monitoring and Costs

**View your usage**:
- Go to: https://console.cloud.google.com/run
- Click on your service
- See metrics: requests, latency, memory usage

**Stay within free tier**:
- Cloud Run scales to zero when not in use (no cost)
- 2 million requests/month is very generous
- If you exceed, you'll be notified before charges

---

## Troubleshooting

### Deployment fails with authentication error
- Double-check your `GCP_SA_KEY` secret in GitHub
- Make sure the service account has all required roles

### Firebase connection fails
- Verify `FIREBASE_SERVICE_ACCOUNT` secret is correctly set
- Check Cloud Run logs for error messages

### Service URL not working
- Wait a few minutes for DNS propagation
- Check if the service is set to "allow unauthenticated"

### View detailed logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cost-tracker" --limit 50 --format json
```

---

## Custom Domain (Optional)

To use your own domain:

1. Go to Cloud Run console
2. Click on your service
3. Click "Manage Custom Domains"
4. Follow the instructions to add your domain

---

## Environment Variables

The following environment variables are automatically set:

- `FIREBASE_PROJECT_ID` - From GitHub secrets
- `FIXED_EUR_TO_RSD_RATE` - Set to 117.0
- `NODE_ENV` - Set to production
- `PORT` - Automatically set by Cloud Run (8080)

To add more environment variables, edit `.github/workflows/deploy-cloud-run.yml` in the "Deploy to Cloud Run" step.

---

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check Cloud Run logs in Google Cloud Console
3. Verify all secrets are correctly set in GitHub

Your app will automatically redeploy on every push to master! 🚀
