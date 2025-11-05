# How to Set Up Android Studio for React Native Development on macOS

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

## Step 3: Install Java Development Kit (JDK)
1. Install the OpenJDK 17 using Homebrew:
```cmd
brew install --cask zulu@17
```
2. Get to the path where cask was installed to find the JDK installer and copy the highlighted path (blue marked, but this is different for everyone so don't copy mine):
```cmd
brew info --cask zulu@17
```
<img width="573" alt="image" src="https://github.com/user-attachments/assets/ef5a3784-26c0-4ca0-b615-e614475c0c81">

3. Open finder go to the `Go` tab and click `go to folder`
   <img width="214" alt="image" src="https://github.com/user-attachments/assets/dd6fbcd0-9ca5-4d21-9f6a-07d445c70a17">

4. Paste the copied path in the search:
   <img width="463" alt="image" src="https://github.com/user-attachments/assets/e385ff3b-2479-4e1d-be55-790d7fadb66b">

5. Double click to install the package

6. Add or update your JAVA_HOME environment variable:
   • open terminal
   • Add the following line:
```cmd 
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
```

7. Verify JDK installation:
```cmd
java -version
```

## Step 4: Install Android Studio
1. Download and install [Android Studio](https://developer.android.com/studio).
2. During the installation wizard, ensure the following components are selected:
   •	Android SDK
   •	Android SDK Platform
   •	Android Virtual Device
3. If any of these components are missing, you can install them later.

## Step 5: Configure the Android SDK
1. Open Android Studio.
2. Click on More Actions > SDK Manager from the welcome screen.
   <img width="1010" alt="image" src="https://github.com/user-attachments/assets/0fd633cc-feec-441f-941b-a573874fc059">

3. In the SDK Platforms tab:
   • Check Show Package Details in the bottom right corner.
   •	Expand the Android 15 (VanillaIceCream) SDK and ensure the following are selected:
   •	Android SDK Platform 35
   •	Google APIs ARM 64 v8a System Image (for M1/M2 Macs).
   <img width="728" alt="image" src="https://github.com/user-attachments/assets/b0c0c8eb-794d-428d-910d-0641f5cd58a6">

4. In the SDK Tools tab:
   •	Check Show Package Details.
   •	Expand Android SDK Build-Tools and select version 35.0.0.
   <img width="735" alt="image" src="https://github.com/user-attachments/assets/95e88da2-32bc-4ebe-a936-f3894cf0df41">

5. Click Apply to install the selected SDK components.

## Step 6: Configure Environment Variables

1. Add the following lines to your terminal:
```cmd
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```
2. Verify the environment variables:
   •	Check ANDROID_HOME:
```cmd
echo $ANDROID_HOME
```

## Step 7: Preparing the Android device

1. Go to Virtual device manager:
   <img width="1023" alt="image" src="https://github.com/user-attachments/assets/2ef68a32-7e0b-4155-82f3-af276891edb5">

2. Click on the `+` button and a device of choice.

3. Press next and don't forget to put it on `portrait` mode instead of `landscape` mode.

## Step 8: Starting the App

1. Open your project (Domits).

2. Open the terminal in your code editor.

3. Move to your Android folder:
```cmd
cd /Domits/app/Domits/android
```
4. run the App:
```cmd
npx react-native start
```
5. Reload the app by choosing option `r`

6. Boot up the device you chose from virtual device.


## React native setup: Extra information can be found in the [react-native onboarding](https://reactnative.dev/docs/set-up-your-environment](https://reactnative.dev/docs/set-up-your-environment?platform=android))


