#!/bin/bash

# Digital Production Generator - GCP Setup Script
set -e

# Configuration
PROJECT_ID="dpgen-production"  # Change this to your desired project ID
REGION="us-central1"
ZONE="us-central1-a"

echo "🚀 Setting up Digital Production Generator on GCP..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first."
    exit 1
fi

# Create project (if it doesn't exist)
echo "📋 Creating GCP project: $PROJECT_ID"
gcloud projects create $PROJECT_ID --name="Digital Production Generator" || true

# Set project
gcloud config set project $PROJECT_ID

# Enable billing (you'll need to do this manually in console if not already done)
echo "💳 Note: Make sure billing is enabled for project $PROJECT_ID"

# Enable required APIs
echo "🔌 Enabling required APIs..."
gcloud services enable \
    aiplatform.googleapis.com \
    firestore.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    storage.googleapis.com \
    texttospeech.googleapis.com \
    videointelligence.googleapis.com \
    vision.googleapis.com \
    youtube.googleapis.com \
    customsearch.googleapis.com \
    translate.googleapis.com

# Set default region/zone
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE

# Create Cloud Storage buckets for each channel
echo "🗄️  Creating storage buckets..."
BUCKETS=(
    "dpgen-circuit-myth"
    "dpgen-deeptime"
    "dpgen-zero-view"
    "dpgen-map-oddities"
    "dpgen-space-minute"
    "dpgen-design-details"
    "dpgen-pattern-language"
    "dpgen-econ-snack"
    "dpgen-shared"
)

for bucket in "${BUCKETS[@]}"; do
    gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$bucket/ || echo "Bucket $bucket already exists"
    # Set lifecycle policy to delete temp files after 7 days
    echo '[{"rule": {"action": {"type": "Delete"}, "condition": {"age": 7, "matchesPrefix": ["temp/"]}}}]' | gsutil lifecycle set /dev/stdin gs://$bucket/
done

# Initialize Firestore in Native mode
echo "🔥 Initializing Firestore database..."
gcloud firestore databases create --region=$REGION || echo "Firestore already initialized"

echo "✅ GCP setup complete!"
echo "📝 Next steps:"
echo "   1. Ensure billing is enabled for project $PROJECT_ID"
echo "   2. Run the Firestore seeding script"
echo "   3. Create service accounts for authentication"