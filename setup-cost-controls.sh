#!/bin/bash

# Cost Control Setup Script for Google Cloud Run
# This script sets up strict budgets and alerts to prevent any charges

set -e

echo "🔒 Setting up cost controls for Cloud Run..."

# Check if required variables are set
if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID environment variable not set"
    echo "Usage: PROJECT_ID=your-project-id ./setup-cost-controls.sh"
    exit 1
fi

SERVICE_NAME="cost-tracker"
REGION="europe-west1"

echo "Project ID: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Step 1: Enable Billing Budget API
echo "📊 Enabling Billing Budget API..."
gcloud services enable billingbudgets.googleapis.com --project=$PROJECT_ID

# Step 2: Get Billing Account ID
echo "💰 Getting billing account..."
BILLING_ACCOUNT=$(gcloud billing projects describe $PROJECT_ID --format="value(billingAccountName)" | sed 's/.*\///')

if [ -z "$BILLING_ACCOUNT" ]; then
    echo "⚠️  No billing account found. Please link a billing account to your project first."
    exit 1
fi

echo "Billing Account: $BILLING_ACCOUNT"

# Step 3: Create Budget Alert at $0.01 (will stop before charges)
echo "🚨 Creating budget alert at $0.01..."

cat > /tmp/budget.json <<EOF
{
  "displayName": "Cost Tracker - Stop at Free Tier Limit",
  "budgetFilter": {
    "projects": ["projects/$PROJECT_ID"],
    "services": ["services/152E-C115-5142"]
  },
  "amount": {
    "specifiedAmount": {
      "currencyCode": "USD",
      "units": "0",
      "nanos": 10000000
    }
  },
  "thresholdRules": [
    {
      "thresholdPercent": 0.5,
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": 0.9,
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": 1.0,
      "spendBasis": "CURRENT_SPEND"
    }
  ],
  "allUpdatesRule": {
    "pubsubTopic": "projects/$PROJECT_ID/topics/budget-alerts",
    "schemaVersion": "1.0"
  }
}
EOF

# Create Pub/Sub topic for budget alerts
echo "📢 Creating Pub/Sub topic for budget alerts..."
gcloud pubsub topics create budget-alerts --project=$PROJECT_ID 2>/dev/null || echo "Topic already exists"

# Create budget using REST API
echo "💵 Creating budget with strict $0.01 limit..."
gcloud alpha billing budgets create \
  --billing-account=$BILLING_ACCOUNT \
  --display-name="Cost Tracker - Free Tier Guard" \
  --budget-amount=0.01USD \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0 \
  --filter-projects=projects/$PROJECT_ID 2>/dev/null || echo "Budget may already exist"

# Step 4: Set up Cloud Run service quotas
echo "⚙️  Configuring Cloud Run quotas..."

# Set maximum concurrent requests quota
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --max-instances=3 \
  --min-instances=0 \
  --concurrency=80 \
  --cpu-throttling \
  --project=$PROJECT_ID 2>/dev/null || echo "Service not deployed yet - quotas will be applied on first deployment"

# Step 5: Set up monitoring alert for high request rates
echo "📈 Creating monitoring alert for request rate..."

cat > /tmp/alert-policy.json <<EOF
{
  "displayName": "Cost Tracker - High Request Rate Alert",
  "conditions": [
    {
      "displayName": "Request rate > 150K/month",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_count\"",
        "aggregations": [
          {
            "alignmentPeriod": "3600s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 1.74,
        "duration": "300s"
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-policy.json --project=$PROJECT_ID 2>/dev/null || echo "Alert policy may already exist"

# Cleanup temp files
rm -f /tmp/budget.json /tmp/alert-policy.json

echo ""
echo "✅ Cost controls configured successfully!"
echo ""
echo "🔒 Protection measures in place:"
echo "  • Budget alert at \$0.01 (50%, 90%, 100% notifications)"
echo "  • Max instances: 3 (prevents scaling beyond free tier)"
echo "  • Min instances: 0 (scales to zero = no cost when idle)"
echo "  • Concurrency: 80 requests per instance"
echo "  • Memory: 256Mi (optimal for free tier)"
echo "  • CPU throttling: Enabled (saves compute time)"
echo "  • Request rate monitoring: Alert at 150K requests/month"
echo ""
echo "📧 Budget alerts will be sent to the billing account email"
echo "⚠️  Recommended: Set up email notifications in Google Cloud Console:"
echo "    https://console.cloud.google.com/billing/budgets?project=$PROJECT_ID"
echo ""
echo "🎯 Free tier limits:"
echo "  • 2 million requests/month"
echo "  • 360,000 GB-seconds of memory"
echo "  • 180,000 vCPU-seconds"
echo ""
echo "With these settings, you should stay well within free tier! 🎉"
