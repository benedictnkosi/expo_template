# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Environment Setup

### Android Development Setup

1. Download and install Android Studio from [developer.android.com](https://developer.android.com/studio)

2. Set up your ANDROID_HOME environment variable:

   For macOS/Linux, add these lines to your `~/.bash_profile`, `~/.zshrc`, or equivalent:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

   For Windows, set the environment variable through System Properties:
   - Open System Properties > Advanced > Environment Variables
   - Add new System Variable:
     - Variable name: ANDROID_HOME
     - Variable value: C:\Users\YourUsername\AppData\Local\Android\Sdk

3. After setting the environment variables, restart your terminal and IDE

4. In Android Studio:
   - Go to Tools > SDK Manager
   - Install the following:
     - Android SDK Platform Tools
     - At least one Android SDK Platform (recommended: Android 13 (API Level 33))
     - Android SDK Build-Tools


### run on android emulator
npx expo run:android

### build code
npx expo prebuild

### build apk for preview
eas build --profile preview --platform android

### build apk for production
eas build --profile production --platform android

### build apk for development
eas build --profile development --platform android

### manage credentials
eas credentials
px expo credentials:manager --info

submit to android



eas submit --platform android


### build aab for production locally
First, locate your Expo keystore. It's stored in your Expo credentials. You can download it using:

eas credentials --platform android

Then select:
Your build profile (production)
"Keystore: Manage everything needed to build your project"
"Download Keystore"
Create a gradle.properties file in android/app/ with these credentials (you'll get the actual values after downloading the keystore):

MYAPP_UPLOAD_STORE_FILE=keystore.jks
MYAPP_UPLOAD_KEY_ALIAS=18a2509529bd69f94e3d92cb654ab2ca
MYAPP_UPLOAD_STORE_PASSWORD=<keystore password from expo>
MYAPP_UPLOAD_KEY_PASSWORD=<key password from expo>

Move the downloaded keystore file to android/app/keystore.jks
Update your android/app/build.gradle:

android {
    // ... existing code ...
    
    signingConfigs {
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}


## Then build your AAB:
change the  versionCode in /Users/mac1/Documents/cursor/examquiz/android/app/build.gradle
defaultConfig {
        applicationId 'za.co.examquizafrica'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 201
        versionName "2.0.1"
    }

cd android
./gradlew clean
./gradlew bundleRelease

## or just run the build.sh script
./build.sh


### clean project
npx expo prebuild --clean


### clean build
npx expo prebuild --clean && npx expo run:android

cd android && ./gradlew clean

./build-aab.sh


### build apk
./build-apk.sh


### IOS
 
## open emulator 
open -a Simulator

allow firebase on ios
add line:
 use_modular_headers!
 pod 'FirebaseCore', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseAuth', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true

  use_frameworks! :linkage => :static
  
/Users/mac1/Documents/cursor/examquiz-launch/examquiz/ios/Podfile

expo prebuild
cd ios && pod install && cd ..
npx expo run:ios



## 3 clean and build
cd ios && rm -rf Pods Podfile.lock && pod deintegrate && pod cache clean --all && pod install && cd .. && npx expo run:ios

## using xcode build
xcodebuild -workspace examquiz.xcworkspace -scheme examquiz -configuration Release clean build | grep -E "error:|warning:" || echo "Build completed successfully with no errors"