# How to Set Up xCode and Configure for React Native Development

## Step 1: Install Homebrew
1. Make sure you have Homebrew downloaded on your Mac.
2. Run the following code (in your terminal) if you haven't downloaded Homebrew yet:
```cmd
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
## Step 2: Install Node.js and Watchman
1. Run the following commands in Terminal to install Node.js and Watchman:
```cmd
brew install node
brew install watchman
```
2. Verify Node.js version to ensure it’s 18.18 or newer
```cmd
node -v
```
3. Verify Watchman installation:
```cmd
watchman -v
```
## Step 3: Install Xcode
1. Download and install Xcode from the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?mt=12).
2. Open Xcode after installation and agree to the license agreement.

## Step 4: Install Xcode Command Line Tools
1. Open Xcode.
2. Go to Settings… (or Preferences…) from the Xcode menu.
3. Navigate to the Locations tab.
4. Select the latest version of Command Line Tools in the dropdown menu.
   <img width="639" alt="image" src="https://github.com/user-attachments/assets/3512ec39-8b66-42a6-8e2c-7050244e0fa2">

## Step 5: Install iOS Simulator in Xcode
1. Open Xcode.
2. Go to Settings… (or Preferences…) and select the Platforms (or Components) tab.
3. Click the “+” icon and add the desired iOS simulator version (iOS).
   <img width="841" alt="image" src="https://github.com/user-attachments/assets/42dfcc38-f433-4a9c-89a9-7b8105949f48">

## Step 6: Install CocoaPods (Terminal again)
1. CocoaPods is required for managing iOS dependencies. Install it using the Ruby version included with macOS:
```cmd
sudo gem install cocoapods
```
2. Verify the installation:
```cmd
pod --version
```

## Step 7: Npm/Pod install

1. Open the /app/Domits folder (terminal in your code editor):
```cmd
Domits/app/Domits
```
2. Npm install:
```cmd
npm install
```
3. Move to the ios folder (Domits/app/Domits/ios) and install pods
```cmd
cd ios
pod install
```

## Step 8: Start the app

1. In your code editor (VsCode or Intellij) go to the ios folder (through the terminal of your code editor):
```cmd
cd ios  
```
2. Run the following code to start up the app:
```cmd
npx react-native start  
```
3. Choose the `r` option to reload

4. Now switch to xCode and press the play button to start up the app. Now the app will automatically start up.

## Step 9: Possible build error

Xcode is quite a fragile environment and contains a lot of issues/errors, most of the errors are documented in the [xCode error wiki](https://github.com/domits1/Domits/wiki/iOS-xCode-Errors).

## React native setup: Extra information can be found in the [react-native onboarding](https://reactnative.dev/docs/set-up-your-environment)
