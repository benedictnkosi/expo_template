#!/bin/bash

# Navigate to android directory and run build commands
cd android
./gradlew clean
./gradlew assembleDebug


echo "Build completed and installed!"