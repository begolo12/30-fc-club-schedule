#!/bin/bash

# Script untuk setup dan deploy push notifications

echo "🚀 30 FC Push Notifications Setup"
echo "=================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
else
    echo "✅ Firebase CLI found"
fi

echo ""
echo "📝 Step 1: Login to Firebase"
firebase login

echo ""
echo "📦 Step 2: Installing Cloud Functions dependencies"
cd functions
npm install
cd ..

echo ""
echo "🔨 Step 3: Building Cloud Functions"
cd functions
npm run build
cd ..

echo ""
echo "🚀 Step 4: Deploying Cloud Functions"
firebase deploy --only functions

echo ""
echo "✅ Setup complete!"
echo ""
echo "⚠️  IMPORTANT: Don't forget to:"
echo "1. Generate VAPID key from Firebase Console"
echo "2. Update VAPID_KEY in src/lib/fcm.ts"
echo "3. Build and deploy the web app: npm run build && firebase deploy --only hosting"
echo ""
echo "📖 Read PUSH_NOTIFICATIONS_SETUP.md for detailed instructions"
