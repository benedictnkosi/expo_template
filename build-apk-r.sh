#!/bin/bash

# Copy google-services.json to the correct location
echo "Copying google-services.json to app directory..."
cp google-services.json android/app/google-services.json

# Copy and rename keystore file
echo "Copying and renaming keystore file..."
cp @nkosib__exam-quiz.jks android/app/keystore.jks

#copy build.gradle to android directory
echo "Copying build.gradle to android directory..."
cp build.gradle android/app/build.gradle

# Navigate to android directory
cd android

# Clean the build directory
./gradlew clean

# Build release APK
./gradlew assembleRelease

# Check if build was successful
if [ -f app/build/outputs/apk/release/app-release.apk ]; then
    echo "Release APK built successfully!"
    echo "Location: $(pwd)/app/build/outputs/apk/release/app-release.apk"
    cp /app/build/outputs/apk/release/app-release.apk /Users/mac1/Documents/apk/app-release.apk
    cp /app/build/outputs/apk/release/app-release.apk /Users/mac1/Documents/cursor/exam-quiz-appium/AppiumProject/app-release.apk
else
    echo "Build failed! Check logs for errors."
    exit 1
fi

# Optional: Install on connected device (commented out for safety)
# adb install app/build/outputs/apk/release/app-release.apk 