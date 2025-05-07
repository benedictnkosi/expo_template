#!/bin/bash

# Copy google-services.json to the correct location
echo "Copying google-services.json to app directory..."
cp google-services.json android/app/google-services.json

# Copy and rename keystore file
echo "Copying and renaming keystore file..."
cp @nkosib__exam-quiz.jks android/app/keystore.jks

#copy build.gradle to android/app directory
echo "Copying build.gradle to android/app directory..."
cp app-build.gradle android/app/build.gradle

#copy build.gradle to android directory
echo "Copying build.gradle to android directory..."
cp android-build.gradle android/build.gradle

# Navigate to android directory
cd android

# Clean the build directory
 ./gradlew clean

# Build release APK
./gradlew assembleRelease

APK_PATH="$(pwd)/app/build/outputs/apk/release/app-release.apk"
DRIVE_DIR="/Users/mac1/Library/CloudStorage/GoogleDrive-nkosi.benedict@gmail.com/My Drive/Exam Quiz/apk"

# Check if build was successful
if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "$DRIVE_DIR/app-release.apk"
    echo "Copied to $DRIVE_DIR successfully!"
else
    echo "❌ APK not found at: $APK_PATH"
fi

# Optional: Install on connected device (commented out for safety)
# adb install app/build/outputs/apk/release/app-release.apk 