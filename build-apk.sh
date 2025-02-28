#!/bin/bash

# Uninstall existing app
adb uninstall za.co.examquizafrica || true

# Navigate to android directory and run build commands
cd /android
./gradlew clean
./gradlew assembleDebug

# Install new debug build
adb install app/build/outputs/apk/debug/app-debug.apk

echo "Build completed and installed!"