#!/bin/bash

# Navigate to android directory
cd /Users/mac1/Documents/cursor/examquiz/android

# Clean the build directory
./gradlew clean

# Build release APK
./gradlew assembleRelease

# Check if build was successful
if [ -f app/build/outputs/apk/release/app-release.apk ]; then
    echo "Release APK built successfully!"
    echo "Location: $(pwd)/app/build/outputs/apk/release/app-release.apk"
    cp /app/build/outputs/apk/release/app-release.apk /Users/mac1/Documents/apk/app-release.apk
else
    echo "Build failed! Check logs for errors."
    exit 1
fi

# Optional: Install on connected device (commented out for safety)
# adb install app/build/outputs/apk/release/app-release.apk 