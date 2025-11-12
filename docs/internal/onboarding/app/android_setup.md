# Android Development Environment Setup
You can find more information about setting up a React-Native project in the [Official React Native Documentation](https://reactnative.dev/docs/set-up-your-environment?os=windows&platform=android).

> [!IMPORTANT]  
> For all _environment variables_ steps, you need to add them to you *user variables*.

## Table of Contents
<!-- TOC -->
* [Step 1 - NodeJs Setup](#step-1---nodejs-setup)
* [Step 2 - JDK-17 setup](#step-2---jdk-17-setup)
* [Step 3 - Android Studio setup](#step-3---android-studio-setup)
* [Step 4 - Project folder setup](#step-4---project-folder-setup)
* [Step 5 - AWS Setup](#step-5---aws-setup)
* [Step 6 - Node_Modules setup](#step-6---node_modules-setup)
* [Step 7 - Testing environment setup](#step-7---testing-environment-setup)
* [Step 8 - Final build setup](#step-8---final-build-setup)
  * [Alternatives to Android Studio](#alternatives-to-android-studio)
<!-- TOC -->

## Step 1 - NodeJs Setup
Download and run the NodeJs installer: https://nodejs.org/en/download

## Step 2 - JDK-17 setup
> [!NOTE]  
> React Native currently recommends version 17 of the Java SE Development Kit (JDK). You may encounter problems using higher JDK versions.

1. Download and run the OpenJDK-17 installer: https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-17
2. Open Control Panel and lookup: `environment variables`. 
3. Press: _"Edit the system environment variables"_ and click on the _"Environment Variables..."_ button.
4. Search for an environment variable called `JAVA_HOME`. If it exists, edit the variable value to the path to the JDK-17 you just installed. If it does not exist yet, click the _"New..."_ button. As the variable _name_ input `JAVA_HOME` and as variable _value_ input the path to the JDK-17 you just installed.
5. Next, look for an environment variable called _"Path"_. Open it and add the path to the JDK-17 you just installed. If there is any other JDK paths in here, remove them.
6. Now reboot your device for the changes to take effect.

## Step 3 - Android Studio setup
1. Download the Android Studio installer: https://developer.android.com/studio. Complete the installer and make sure to tick the "install emulator" checkbox.
2. Open Android Studio. Go to _"settings"_ and search for _"SDK Manager"_.
3. Select _"Android 14 with API level 34"_ and press _"OK"_.
4. Press Windows key + r and type `%LOCALAPPDATA%`. Look for the "Android" directory and open it, in here Open the "sdk" directory and copy the complete file path.
5. Open Control Panel and lookup: `environment variables`. Press: "Edit the system environment variables" and click on the "Environment Variables..." button.
6. Create a variable called: `ANDROID_HOME`. Set the path you just copied as its value.
7. Create a variable called: `ANDROID_SDK_ROOT`. Set the path you just copied as its value.
8. Look for environment variable called: _"Path"_. Set the path you just copied as its value.

## Step 4 - Project folder setup
> [!WARNING]  
> React-Native has a library which checks for the length of file paths which means you need the file path to be as short as possible. It might not be able to find your project if the path is too long.

1. Open explorer and go to your SSD drive (Root). Create a folder where you will be storing the files for your projects. 
2. Open the folder and click the file-path bar. Type _"cmd"_ to open the terminal in the current directory.
3. In your cmd, if you have SSH keys setup for GitHub type `git clone git@github.com:domits1/Domits.git`. Otherwise, use `git clone https://github.com/domits1/Domits.git`.
4. Open your project in Android Studio. If it doesn't create _".idea/misc.xml"_, no extra action is needed. If Android Studio automatically generates _".idea/misc.xml"_, type `git stash` in your android studio terminal followed by `git checkout acceptance`. 

> [!TIP]   
> Alternatively, you can use tools such as [git Fork](https://git-fork.com/) to help with cloning and other git actions.

## Step 5 - AWS Setup
> [!IMPORTANT]   
> For these steps you will need to be added to the Domits-Team on AWS. If you are not added yet, ask Stefan for help or skip these steps for now (Your build will NOT fully run at the end of this guide, but you can come back to this later, and it will function properly.).

1. Type `cd frontend/app/Domits`
2. Type `npm install -g @aws-amplify/cli`
3. To confirm the global installation was successful, type `amplify -v`
4. Delete the existing amplify folder in the app/Domits directory
5. Type `amplify pull --appId d34jwd0sihmsus --envName develop`
6. Amplify will open a tab to AWS in your browser, log in with the credentials given to you by Stefan and go back to your android studio.
7. Use your arrow keys to select the following options:
   - None (Press enter) -> 
   - JavaScript (Press enter) -> 
   - React-Native (Press enter) -> 
   - (Press enter) -> 
   - (Press enter) -> 
   - (Press enter) -> 
   - (Press enter) -> 
   - (Type out) no (Press enter))

## Step 6 - Node_Modules setup
1. Type `npm install`
2. **Node modules fixes**: Some node modules will give errors/warning during development. These are temporary fixes while waiting for API updates.
   1. **ViewPropTypes deprecated warning**
      - After installing all packages, search for the following file on the following path:`frontend\app\Domits\node_modules\react-native\index.js`
      - Press ctrl + f and lookup: "ViewPropTypes", it will show you a console.error. Comment out the entire getter. (You will have to do this step everytime you run "npm install")
   2. **IOException fix for RN image picker node module**
      - search for the Utils.java file in the react-native-image-picker node module:
        `node_modules/react-native-image-picker/android/src/main/java/com/imagepicker/Utils.java`
      - replace `m.release();` inside the `getDuration` function with the following:
      ```java interface
      try {
          m.release();
      } catch (IOException e) {
          e.printStackTrace();
      }
      ```

## Step 7 - Testing environment setup
In order to set up your project environment to testing add an .env file in frontend/app/Domits with the following lines:
```
REACT_APP_EXAMPLE=This is an example. Copy + Paste this file in the same directory and remove .example from the file name
REACT_APP_EXAMPLE_EXPLANATION=In React-Native, you need REACT_APP in front of your variables.
REACT_APP_EXAMPLE_RENDERING=Whenever you make changes to .env files. You must run "npx react-native start --reset-cache"
REACT_APP_TESTING=false
```
When you want to test your project using test repositories, ensure `REACT_APP_TESTING` is set to `true` and restart your application using `npx react-native start --reset-cache`.

## Step 8 - Final build setup
1. In Android Studio, go to your 'Device Manager' tab. Click on the _"+"_ followed by 'Create Virtual Device'.
2. Select the _"Medium Phone"_ and click _"Next"_.
3. Select the system image with API 34, this will be target Android 14.0 with release name: "UpsideDownCake", and click Next.
4. Name your emulator if you like and click _"Finish"_.
5. Click the _"Start"_ button on your emulator and your emulator will start in the 'Running Devices' tab.
6. In your terminal, type `npx react-native start`. Wait for Metro to start. Once you see an option in your terminal saying: "a - run on Android", press: "a" to start running the project.
7. Now wait for Android Studio to prepare a build and download it on your emulator. This can take quite some time.

### Alternatives to Android Studio
You can also start an AVD (Android Virtual Device) manually in the cmd terminal and use your preferred IDE to start the application. 

1. Open the cmd terminal and go to your following file location by running the following line:
    ```
    cd AppData\Local\Android\Sdk\emulator
    ```
2. Check the available emulators with:
    ```
    emulator -list-avds
    ```
3. Start your desired emulator with the following and replace `[emulator-name]` with an emulator from the available list:
    ```
    emulator -writable-system -avd [emulator-name]
    ```
4. In your IDE, start your application by running the following in Domits/app/Domits:
    ```
    npx react-native run-android
    ```
