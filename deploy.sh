#!/bin/bash

# Exit on any error
set -e

echo "📦 Starting deployment process..."

# Navigate to the firework-factory directory
cd "$(dirname "$0")/firework-factory"

# Build the application
echo "🔨 Building the application..."
npm run build

# Navigate back to the parent directory
cd ..

# Deploy to Firebase Hosting
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete! Visit https://firework-factory.web.app to see your changes."
