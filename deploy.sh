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
# Install compatible version of firebase-tools
echo "Installing firebase-tools v12.9.1 globally..."
npm install -g firebase-tools@12.9.1
firebase deploy --only hosting

echo "✅ Deployment complete! Visit https://firework-factory.web.app to see your changes."
