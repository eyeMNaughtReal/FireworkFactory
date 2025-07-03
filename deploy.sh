#!/bin/bash

# Exit on any error
set -e

echo "📦 Starting deployment process..."

# Increment version number
echo "🔄 Incrementing version number..."
node ./scripts/increment-version.js

# Build the application
echo "🔨 Building the application..."
npm run build

# Deploy to Firebase Hosting
echo "🚀 Deploying to Firebase Hosting..."
# Make sure we have firebase-tools installed
if ! command -v firebase &> /dev/null; then
  echo "Installing firebase-tools globally..."
  npm install -g firebase-tools
fi
firebase deploy --only hosting

echo "✅ Deployment complete! Visit https://firework-factory.web.app to see your changes."
