# xCode Environment Setup for iOS Development
[xCode](https://developer.apple.com/xcode/) is Apple's integrated development environment (IDE) needed to develop, test, and distribute apps for Apple platforms. This IDE is only available for Mac appliances.

## Table of Contents
<!-- TOC -->
  * [Step 1 - Install Homebrew](#step-1---install-homebrew)
  * [Step 2 - Install Dependencies](#step-2---install-dependencies)
  * [Step 3 - Install Xcode](#step-3---install-xcode)
  * [Step 4 - Install Xcode Command Line Tools](#step-4---install-xcode-command-line-tools)
  * [Step 5 - Install iOS Simulator in Xcode](#step-5---install-ios-simulator-in-xcode)
  * [Step 6 - Npm/Pod install](#step-6---npmpod-install)
  * [Step 7 - Start the app](#step-7---start-the-app)
    * [Possible build errors](#possible-build-errors)
  * [Testing beta releases with TestFlight](#testing-beta-releases-with-testflight)
    * [Mac only](#mac-only)
    * [All platforms](#all-platforms)
    * [App Store live submission](#app-store-live-submission)
<!-- TOC -->

## Step 1 - Install Homebrew
1. Run the following code (in your terminal) if you haven't downloaded [Homebrew](https://brew.sh/) yet:
   ```cmd
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Verify Homebrew installation by running `brew --version`.

## Step 2 - Install Dependencies
[Node.js](https://nodejs.org/en) provides the JavaScript runtime required for running development tools and building modern apps.
[Watchman](https://facebook.github.io/watchman/) monitors file changes efficiently, enabling fast rebuilds and live reload during development.
[CocoaPods](https://guides.cocoapods.org/using/getting-started.html) manages iOS project dependencies, making it easy to integrate third-party libraries..

1. Run `brew install node` to install **_Node.js_**.
2. Verify Node.js version to ensure it’s 18.18 or newer by using `node -v`.
3. Run `brew install watchman` to install _**Watchman**_.
4. Verify Watchman installation by running `watchman -v`.
5. Run `sudo gem install cocoapods` to install _**CocoaPods**_. 
6. Verify CocoaPods installation by running `pod --version`.
   
## Step 3 - Install Xcode
1. Download and install Xcode from the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?mt=12).
2. Open Xcode after installation and agree to the licence agreement.

## Step 4 - Install Xcode Command Line Tools
1. Open Xcode.
2. Go to Settings… (or Preferences…) from the Xcode menu.
3. Navigate to the Locations tab.
4. Select the latest version of Command Line Tools in the dropdown menu.
   <img width="639" alt="image" src="https://github.com/user-attachments/assets/3512ec39-8b66-42a6-8e2c-7050244e0fa2">

## Step 5 - Install iOS Simulator in Xcode
1. Open Xcode.
2. Go to Settings… (or Preferences…) and select the Platforms (or Components) tab.
3. Click the “+” icon and add the desired iOS simulator version (iOS).
   <img width="841" alt="image" src="https://github.com/user-attachments/assets/42dfcc38-f433-4a9c-89a9-7b8105949f48">

## Step 6 - Npm/Pod install
1. Navigate to the _"frontend/app/Domits"_ folder (terminal in your code editor) using `cd frontend/app/Domits`.
2. Install the node modules using `npm install`.
3. Move to the ios folder _"(Domits/app/Domits/ios)"_ using `cd ios`.
4. Install pod by running `pod install`.

## Step 7 - Start the app
> [!TIP]   
> Check out the [React Native](https://reactnative.dev/docs/set-up-your-environment?platform=ios&os=macos) documentation to find more about running a React Native project on your macOS. 

1. In your code editor terminal (VsCode or Intellij) navigate to the ios folder using `cd frontend/app/Domits/ios` (if you aren't already in this folder).
2. Run `npx react-native start` to start up Metro.
3. Choose the `r` option to reload the app if needed.
4. Switch to xCode and press the play button to start up the iOS simulator. The app will automatically start up.

### Possible build errors
Xcode is quite a fragile environment and contains a lot of issues/errors, most of the errors are documented in the [xCode error wiki](https://github.com/domits1/Domits/wiki/iOS-xCode-Errors).

## Testing beta releases with TestFlight
[TestFlight](https://testflight.apple.com/)  is Apple’s official platform for distributing and testing beta versions of iOS, iPadOS, macOS, tvOS, and watchOS apps before they’re released on the App Store.

---
### Mac only
To get the app on TestFlight you need to have Xcode. Make sure the build runs first by running Command + R or going to product > run. Once you confirm that the build runs, go to Product > Archive. After the build completes you can select where to distribute the app. Select TestFlight and press distribute app.

### All platforms
Once you have a build on TestFlight you need to validate it on [appstoreconnect](https://appstoreconnect.apple.com/). Once you acquire access to the Domits appstoreconnect, go to Apps > Domits. Here you can see the build you just distributed. Sign the compliance and the build should be updated on TestFlight in a few minutes.

### App Store live submission
Follow the same process in Xcode. However, select appstoreconnect instead of TestFlight when you have to choose where to distribute.
> We submitted a request and it got rejected. Make sure that there are no empty features on the app. Remove any unnecessary frontend code that have no functionality (yet). Also provide a working test account for the reviewers to be able to log into.
