#!/bin/bash

echo "Setting up Expo Fridge App..."

# Install Expo CLI if not already installed
if ! command -v expo &> /dev/null; then
    echo "Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Clean existing node_modules and package-lock
echo "Cleaning existing installation..."
rm -rf node_modules
rm -f package-lock.json

# Remove old metro config since we're using Expo
if [ -f "metro.config.js" ]; then
    echo "Removing old metro config..."
    rm metro.config.js
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create basic assets directory
mkdir -p assets

# Create placeholder assets if they don't exist
if [ ! -f "assets/icon.png" ]; then
    echo "Creating placeholder icon..."
    # You can replace this with actual icon files
    touch assets/icon.png
    touch assets/splash.png
    touch assets/adaptive-icon.png
    touch assets/favicon.png
fi

echo "Setup complete!"
echo ""
echo "To run the app:"
echo "  npm start"
echo ""
echo "Then press 'i' for iOS simulator or scan QR code for Expo Go"