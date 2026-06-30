---
type: runbook
status: active
area: developer-onboarding
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/onboarding/app/app_onboarding.md
  - repo: docs/internal/onboarding/app/android_setup.md
  - repo: docs/internal/onboarding/app/android_macOS_setup.md
  - repo: docs/internal/onboarding/app/ios_setup.md
  - repo: docs/internal/onboarding/app/archive/xCode_troubleshooting.md
related:
  - [[Local_Development_Setup]]
  - [[Domits_Developer_Onboarding]]
  - [[Project_Structure]]
  - [[Domits_Engineering_Foundation]]
---
# Domits Mobile App Setup

- Last synced: 2026-06-03
- Scope: durable onboarding path for the React Native app under `frontend/app/Domits`.

## Core Rules

- Domits mobile uses React Native, not Expo.
- iOS development requires macOS.
- On Windows, mobile onboarding means Android only.
- Keep the clone path short on Windows; React Native path-length issues still matter.
- App source lives in `frontend/app/Domits`.

## Choose The Right Platform Branch

- Windows + Android: use the Windows Android branch below.
- macOS + Android: use the macOS Android branch below.
- macOS + iOS: use the iOS branch below.
- If your task spans platforms, get one platform running first before adding the second.

## Shared App Setup

1. Clone the repo to a short path.
2. Move into the app root:

```bash
cd frontend/app/Domits
```

3. Install Amplify CLI and verify it:

```bash
npm install -g @aws-amplify/cli
amplify -v
```

4. Delete the local `amplify/` folder in `frontend/app/Domits` before pulling fresh config.
5. Pull the app backend:

```bash
amplify pull --appId d34jwd0sihmsus --envName develop
```

When Amplify prompts for app details, the repo docs expect:

1. `None`
2. `JavaScript`
3. `React-Native`
4. keep defaults for source, distribution, build, and start
5. `no` for modifying the backend

6. Install dependencies:

```bash
npm install
```

## Windows Android Branch

- Install Node.js.
- Install JDK 17 and set `JAVA_HOME` to the JDK path.
- Clean old JDK entries out of `Path`.
- Install Android Studio with emulator support.
- Install Android 14 / API 34.
- Set `ANDROID_HOME` and `ANDROID_SDK_ROOT` to the Android SDK path.
- Add the Android SDK path to `Path`.
- Reboot the machine after environment-variable changes.

Visual references:

![[99_Attachments/Onboarding/App_Setup/screenshot_sdk_manager_location_welcomescreen.png]]

![[99_Attachments/Onboarding/App_Setup/screenshot_sdk_platform_selection.png]]

### Windows-Specific App Fixes

- After `npm install`, the current onboarding docs still call out two manual node-module fixes:
  - comment out the `ViewPropTypes` getter in `node_modules/react-native/index.js`
  - wrap `m.release();` in `node_modules/react-native-image-picker/android/src/main/java/com/imagepicker/Utils.java` with a `try/catch` for `IOException`
- Create an `.env` file in `frontend/app/Domits` with:

```text
REACT_APP_EXAMPLE=This is an example. Copy + Paste this file in the same directory and remove .example from the file name
REACT_APP_EXAMPLE_EXPLANATION=In React-Native, you need REACT_APP in front of your variables.
REACT_APP_EXAMPLE_RENDERING=Whenever you make changes to .env files. You must run "npx react-native start --reset-cache"
REACT_APP_TESTING=false
```

- For test repositories, set `REACT_APP_TESTING=true` and restart Metro with cache reset.

### Start On Windows Android

1. Create and boot an emulator in Android Studio Device Manager.
2. Start Metro:

```bash
npx react-native start
```

3. Press `a` in the Metro terminal to run on Android, or use `npx react-native run-android`.

Visual references:

![[99_Attachments/Onboarding/App_Setup/screenshot_device_manager_location_welcomescreen.png]]

![[99_Attachments/Onboarding/App_Setup/screenshot_device_manager_location_corner.png]]

## macOS Android Branch

1. Install Homebrew if needed.
2. Install Node.js and Watchman:

```bash
brew install node
brew install watchman
```

3. Install JDK 17:

```bash
brew install --cask zulu@17
```

4. Set:

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
```

5. Install Android Studio.
6. In SDK Manager, install:
   - Android SDK Platform 35
   - Google APIs ARM 64 v8a System Image for Apple Silicon
   - Android SDK Build-Tools 35.0.0
7. Set Android SDK variables:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

8. Boot a virtual device and run Metro:

```bash
npx react-native start
```

Visual references:

![[99_Attachments/Onboarding/App_Setup/screenshot_copied_cask_path_hightlight.png]]

![[99_Attachments/Onboarding/App_Setup/screenshot_gotofolder_button.png]]

![[99_Attachments/Onboarding/App_Setup/screenshot_copied_path_search.png]]

![[99_Attachments/Onboarding/App_Setup/screenshot_sdk_version_selection.png]]

## macOS iOS Branch

1. Install Homebrew if needed.
2. Install Node.js, Watchman, and CocoaPods:

```bash
brew install node
brew install watchman
sudo gem install cocoapods
```

3. Install Xcode from the Mac App Store and accept the license.
4. In Xcode, select the latest Command Line Tools.
5. Install an iOS simulator in Xcode.
6. From the app root:

```bash
cd frontend/app/Domits
npm install
cd ios
pod install
```

7. Start Metro:

```bash
npx react-native start
```

8. Run the app from Xcode.

Visual references:

![[99_Attachments/Onboarding/App_Setup/screenshot_xcode_cmdline_version.png]]

![[99_Attachments/Onboarding/App_Setup/screenshot_add_simulator_button_location.png]]

## Ongoing App Gotchas

- After `.env` changes, run `npx react-native start --reset-cache`.
- After app npm package updates on iOS, rerun `pod install`.
- The app onboarding docs still assume manual local fixes in some node modules; expect to reapply them after fresh installs until the underlying packages are updated.
- The archived `xCode_troubleshooting.md` doc is still relevant when the iOS build environment breaks in non-obvious ways.
- TestFlight upload and App Store Connect validation are macOS/Xcode-only flows.

## Read Next

- Use [[Project_Structure]] for repo layout.
- Use [[Domits_Engineering_Foundation]] for the shared system and delivery model.
