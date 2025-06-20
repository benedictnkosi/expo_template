#!/bin/bash

# Exit on error
set -e

# Copy google-services.json to the correct location
echo "Copying google-services.json to app directory..."
cp google-services.json android/app/google-services.json

# Copy and rename keystore file
echo "Copying and renaming keystore file..."
cp @nkosib__exam-quiz.jks android/app/keystore.jks

# Copy build.gradle files to android directory
echo "Copying build.gradle files to android directory..."
cp android-build.gradle android/build.gradle
cp app-build.gradle android/app/build.gradle

# Path to build.gradle
GRADLE_FILE="./android/app/build.gradle"

# First, fix any double quotes in build.gradle
sed -i '' 's/versionName "[0-9]\+\.[0-9]\+\.[0-9]\+"/versionName "2.0.4"/' $GRADLE_FILE

# Extract current versionCode and versionName
CURRENT_CODE=$(grep 'versionCode' $GRADLE_FILE | grep -o '[0-9]\+')
CURRENT_NAME=$(grep 'versionName' $GRADLE_FILE | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

# Increment versionCode
NEW_CODE=$((CURRENT_CODE + 1))

# Increment last number of versionName
NEW_NAME=$(echo $CURRENT_NAME | awk -F. '{$NF = $NF + 1;}1' OFS=.)

# Update build.gradle
sed -i '' "s/versionCode $CURRENT_CODE/versionCode $NEW_CODE/" $GRADLE_FILE
sed -i '' "s/versionName \"$CURRENT_NAME\"/versionName \"$NEW_NAME\"/" $GRADLE_FILE

echo "Updated version from $CURRENT_CODE ($CURRENT_NAME) to $NEW_CODE ($NEW_NAME)"

# Navigate to android directory and run build commands
cd android
./gradlew clean
./gradlew bundleRelease

# Create output directory if it doesn't exist
mkdir -p /Users/mac1/Documents/aab

# Copy the AAB file
cp app/build/outputs/bundle/release/app-release.aab /Users/mac1/Documents/aab/app-release.aab

echo "Build completed!"