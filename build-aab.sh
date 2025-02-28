#!/bin/bash

# Path to build.gradle
GRADLE_FILE="/android/app/build.gradle"

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
cd /android
./gradlew clean
./gradlew bundleRelease

#copy the aab to /Users/mac1/Documents/aab
cp app/build/outputs/bundle/release/app-release.aab /Users/mac1/Documents/aab/app-release.aab

echo "Build completed!"