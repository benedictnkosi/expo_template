#!/bin/bash

# Navigate to android directory and run build commands
cd /Users/mac1/Documents/cursor/examquiz/android
./gradlew clean
./gradlew assembleRelease

#copy the apk and replace existing file to /Users/mac1/Documents/cursor/exam-quiz-appium/AppiumProject
cp app/build/outputs/apk/release/app-release.apk /Users/mac1/Documents/cursor/exam-quiz-appium/AppiumProject/app-release.apk


echo "Build completed!"