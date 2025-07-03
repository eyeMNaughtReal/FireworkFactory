#!/bin/bash

# Exit on any error
set -e

echo "📦 Starting deployment process..."

# Build the application
echo "🔨 Building the application..."
npm run build

# Deploy to Firebase Hosting
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete! Visit https://firework-factory.web.app to see your changes."
