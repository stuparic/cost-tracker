# Cost Controls & Free Tier Protection

This document explains how to ensure your Cost Tracker API **never exceeds the free tier** and **never charges you money**.

## 🎯 Goal: ZERO COST Operation

With proper configuration, your app will:
- ✅ Stay within Google Cloud Run free tier (2M requests/month)
- ✅ Scale to zero when not in use (no idle costs)
- ✅ Alert you before any charges could occur
- ✅ Automatically stop if limits are reached

---

## 🔒 Built-in Free Tier Limits

The deployment is pre-configured with these strict limits:

| Setting | Value | Why |
|---------|-------|-----|
| **Min Instances** | 0 | Scales to zero = no cost when idle |
| **Max Instances** | 3 | Prevents runaway scaling |
| **Memory** | 256Mi | Optimal for NestJS, stays in free tier |
| **CPU Throttling** | Enabled | Reduces compute time |
| **Concurrency** | 80 | Efficient request handling |
| **Timeout** | 60s | Prevents long-running requests |
| **Max Scale Down** | 100% | Fast scale to zero |

### What These Limits Mean:

**With these settings, you can handle approximately:**
- ~500,000 requests/month comfortably within free tier
- ~80 concurrent requests maximum
- Zero cost when nobody is using the API

---

## 💰 Setting Up Budget Alerts

After deploying, run the cost control setup script:

```bash
# Set your project ID
export PROJECT_ID=moneyflow-832f4

# Run the setup script
./setup-cost-controls.sh
```

This script will:
1. ✅ Create a budget with $0.01 limit
2. ✅ Set up alerts at 50%, 90%, and 100% of budget
3. ✅ Configure request rate monitoring
4. ✅ Send email notifications to your billing account

---

## 📊 Manual Budget Setup (Alternative)

If you prefer to set up manually:

### Step 1: Enable Billing Budgets API

1. Go to: https://console.cloud.google.com/apis/library/billingbudgets.googleapis.com
2. Click "Enable"

### Step 2: Create Budget

1. Go to: https://console.cloud.google.com/billing/budgets
2. Click "Create Budget"
3. Fill in:
   - **Name**: Cost Tracker - Free Tier Guard
   - **Budget amount**: $0.01 (or $1 if you want more buffer)
   - **Projects**: Select your cost-tracker project
   - **Services**: Cloud Run

4. Set Alert Thresholds:
   - ✅ 50% of budget
   - ✅ 90% of budget
   - ✅ 100% of budget

5. Configure Actions:
   - ✅ Email alerts to billing admin
   - ✅ (Optional) Pub/Sub notifications

6. Click "Finish"

### Step 3: Set Up Budget Actions (Automatic Shutdown)

⚠️ **Important**: Google Cloud doesn't automatically stop services, but you can set up automated actions:

1. Go to: https://console.cloud.google.com/billing/budgets
2. Click your budget
3. Under "Actions", enable:
   - "Send Pub/Sub message when threshold is exceeded"

4. Create a Cloud Function (optional advanced setup):
   ```javascript
   // This function can automatically disable your service
   // when budget is exceeded (requires additional setup)
   ```

---

## 📧 Email Notifications

You'll receive emails when:
- ✅ 50% of budget is reached (~$0.005)
- ✅ 90% of budget is reached (~$0.009)
- ✅ 100% of budget is reached ($0.01)

**Action Required**: When you receive a 90% alert:
1. Check Cloud Run metrics
2. Verify usage is legitimate
3. If needed, temporarily disable the service:
   ```bash
   gcloud run services update cost-tracker \
     --region europe-west1 \
     --no-traffic
   ```

---

## 📈 Monitoring Your Usage

### View Current Usage

1. **Cloud Run Dashboard**:
   - Go to: https://console.cloud.google.com/run
   - Click on `cost-tracker` service
   - View: Requests, Memory usage, CPU time

2. **Billing Dashboard**:
   - Go to: https://console.cloud.google.com/billing
   - Click "Reports"
   - Filter by: Cloud Run service

3. **Check Current Costs**:
   ```bash
   gcloud billing accounts list
   ```

### Free Tier Breakdown

**Google Cloud Run Free Tier (per month):**
- 2,000,000 requests
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds of compute time

**Your Configuration Uses:**
- 256Mi memory = 0.25 GB
- Each request ~100ms = 0.1s compute
- Scales to 0 when idle

**Rough Calculation:**
- 360,000 GB-seconds ÷ 0.25 GB = 1,440,000 seconds
- 1,440,000 seconds ÷ 0.1s per request = 14,400,000 requests
- **You're limited by the 2M request cap first**

---

## 🚨 Emergency: How to Stop All Costs

If you see unexpected usage or costs:

### Option 1: Disable the Service (Fastest)
```bash
gcloud run services update cost-tracker \
  --region europe-west1 \
  --no-traffic \
  --project moneyflow-832f4
```

### Option 2: Delete the Service
```bash
gcloud run services delete cost-tracker \
  --region europe-west1 \
  --project moneyflow-832f4
```

### Option 3: Disable Cloud Run API
1. Go to: https://console.cloud.google.com/apis/library/run.googleapis.com
2. Click "Disable"
3. Confirm

### Option 4: Remove Billing Account (Nuclear Option)
1. Go to: https://console.cloud.google.com/billing
2. Click on your project
3. Click "Disable billing"
4. ⚠️ This stops ALL services in the project

---

## 🎯 Best Practices to Stay Free

1. **Monitor Weekly**: Check usage every week
2. **Set Calendar Reminders**: Review costs on 1st of each month
3. **Test Locally First**: Don't deploy untested code that might loop
4. **Rate Limit Your Clients**: Prevent abuse from frontend apps
5. **Use Caching**: Cache frequently accessed data
6. **Implement Request Limits**: Add rate limiting in your API

---

## 💡 What Could Cause Unexpected Usage?

**Common Issues:**
1. **DDoS or Bot Attack**: Someone hitting your API repeatedly
   - **Solution**: Enable Cloud Armor (has free tier) or require authentication

2. **Infinite Loop in Code**: Bug causing recursive requests
   - **Solution**: Test locally, add request timeouts

3. **Frontend Polling Too Frequently**: Client app refreshing every second
   - **Solution**: Use reasonable polling intervals (30s+)

4. **Forgotten Background Jobs**: Cron jobs or scheduled tasks
   - **Solution**: Review and disable any schedulers

---

## 📊 Cost Calculation Examples

### Example 1: Light Usage (Definitely Free)
- 50,000 requests/month
- Average request: 100ms, 256Mi memory
- **Cost**: $0.00 ✅

### Example 2: Medium Usage (Still Free)
- 500,000 requests/month
- Average request: 100ms, 256Mi memory
- **Cost**: $0.00 ✅

### Example 3: Heavy Usage (Approaching Limit)
- 1,800,000 requests/month
- Average request: 100ms, 256Mi memory
- **Cost**: $0.00 ✅ (still within 2M free tier)

### Example 4: Over Free Tier
- 2,500,000 requests/month
- **Cost**: ~$0.10 for 500K extra requests ⚠️

---

## 🔧 Advanced: Automatic Service Shutdown

For ultimate protection, you can create a Cloud Function that automatically disables your service when budget is exceeded:

### Step 1: Create Cloud Function

```javascript
// cloud-function/index.js
const { google } = require('googleapis');

exports.stopCloudRun = async (pubsubMessage, context) => {
  const budgetNotification = JSON.parse(
    Buffer.from(pubsubMessage.data, 'base64').toString()
  );

  const costAmount = budgetNotification.costAmount;
  const budgetAmount = budgetNotification.budgetAmount;

  if (costAmount >= budgetAmount) {
    const run = google.run('v1');

    await run.projects.locations.services.setIamPolicy({
      resource: 'projects/YOUR-PROJECT/locations/europe-west1/services/cost-tracker',
      requestBody: {
        policy: {
          bindings: [] // Removes all access
        }
      }
    });

    console.log('Service disabled due to budget limit');
  }
};
```

### Step 2: Deploy Function
```bash
gcloud functions deploy stopCloudRun \
  --runtime nodejs18 \
  --trigger-topic budget-alerts \
  --region europe-west1
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Budget alert created and showing in console
- [ ] Email notifications configured
- [ ] Cloud Run max-instances = 3
- [ ] Cloud Run min-instances = 0
- [ ] Memory = 256Mi
- [ ] CPU throttling enabled
- [ ] Request monitoring alert active
- [ ] Billing account has valid email

---

## 📞 Support

If costs exceed free tier:
1. Check the billing report: https://console.cloud.google.com/billing
2. Review Cloud Run logs for unusual activity
3. Contact Google Cloud Support (free tier includes support for billing questions)

---

## 🎉 Summary

With these controls in place:
- ✅ Your service will scale to zero (no cost when idle)
- ✅ Maximum 3 instances prevents runaway scaling
- ✅ Budget alerts notify you before charges
- ✅ You can manually disable service instantly
- ✅ Estimated capacity: 500K-1.5M requests/month for FREE

**You should never see a charge on your credit card!** 💳❌
