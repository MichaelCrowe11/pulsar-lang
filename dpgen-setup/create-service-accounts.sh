#!/bin/bash

# Digital Production Generator - Service Account Setup
set -e

PROJECT_ID="dpgen-production"  # Update this to match your project

echo "🔐 Creating service accounts and setting up IAM..."

# Main service account for the pipeline
SA_NAME="dpgen-pipeline"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Creating service account: $SA_NAME"
gcloud iam service-accounts create $SA_NAME \
    --display-name="Digital Production Generator Pipeline" \
    --description="Main service account for DPGEN content pipeline"

# Grant necessary roles
echo "🛡️  Setting up IAM roles..."

ROLES=(
    "roles/aiplatform.user"
    "roles/storage.admin"
    "roles/datastore.user"
    "roles/cloudsql.client"
    "roles/run.invoker"
    "roles/cloudbuild.builds.editor"
    "roles/logging.logWriter"
    "roles/monitoring.metricWriter"
    "roles/secretmanager.secretAccessor"
)

for role in "${ROLES[@]}"; do
    echo "Granting role: $role"
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role"
done

# Create and download service account key
echo "🗝️  Creating service account key..."
gcloud iam service-accounts keys create service-account.json \
    --iam-account=$SA_EMAIL

echo "✅ Service account setup complete!"
echo "📄 Service account key saved as: service-account.json"
echo "⚠️  Keep this file secure and never commit it to version control!"

# Set up additional service accounts for specific services
echo "🔧 Creating specialized service accounts..."

# Renderer service account
RENDERER_SA="dpgen-renderer"
RENDERER_EMAIL="${RENDERER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $RENDERER_SA \
    --display-name="DPGEN Video Renderer" \
    --description="Service account for Cloud Run video renderer"

# Grant minimal permissions for renderer
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$RENDERER_EMAIL" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$RENDERER_EMAIL" \
    --role="roles/logging.logWriter"

echo "✨ All service accounts created successfully!"