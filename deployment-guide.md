# Firework Factory Deployment Guide

This document explains how to deploy the Firework Factory application to Firebase Hosting.

## Prerequisites

- Firebase CLI installed and configured
- Node.js and npm installed

## Deployment Steps

### Option 1: Using the Deploy Script

The easiest way to deploy the application is to use the provided deploy script:

```bash
# From the root directory of the project
npm run deploy

# Or directly run the script
./deploy.sh
```

This script will:
1. Navigate to the firework-factory directory
2. Build the application
3. Deploy it to Firebase Hosting

### Option 2: Manual Deployment

If you prefer to deploy manually, follow these steps:

1. Build the application:
```bash
cd firework-factory
npm run build
```

2. Deploy to Firebase Hosting:
```bash
# Navigate back to the parent directory
cd ..
firebase deploy --only hosting
```

## Configuration Details

- The `firebase.json` file in the root directory is configured to use the `firework-factory/dist` directory as the hosting source.
- The application is deployed to https://firework-factory.web.app

## Troubleshooting

If you encounter deployment issues, check the following:

1. Ensure the `dist` directory is created after building the application
2. Verify that `firebase.json` is pointing to the correct directory
3. Make sure you have the necessary permissions to deploy to the Firebase project

## Setting Up a New Environment

To set up a new deployment environment:

1. Install the Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```

4. Select Hosting and follow the prompts
5. Update the `firebase.json` file to point to `firework-factory/dist`
