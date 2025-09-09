### (FOR ALL ENVIRONMENT VARIABLE STEPS, YOU NEED TO ADD THEM TO YOUR USER VARIABLES)

## Android Studio setup
Download the Android Studio installer: `https://developer.android.com/studio`

Complete the installer and make sure to check the install emulator checkbox.

Open Android Studio and go to "More actions" followed by "SDK Manager". In this menu, select Android 15.0 with API Level 35 as well as Android 14 with API Level 34 and press ok.

Press windows key + r and type `%LOCALAPPDATA%`. Look for the "Android" directory and open it, in here Open the "sdk" directory and copy the complete file path.

Open Control Panel and lookup: `environment variables`. Press: "Edit the system environment variables" and click on the "Environment Variables..." button.

Create a variable called: "ANDROID_HOME", the value will be the path you just copied.

Next look for environment variable called: "Path", open it up and add the same path you just copied.

Create a variable called: "ANDROID_SDK_ROOT", the value will be the same path you just copied.


## JDK-17 setup
Download and run the OpenJDK-17 installer: https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-17

Open Control Panel and lookup: `environment variables`. Press: "Edit the system environment variables" and click on the "Environment Variables..." button.

Search for an environment variable called: "JAVA_HOME", if it does not exist yet, click the "New..." button. As the variable name you will put: "JAVA_HOME" and as variable value you will put the path to the JDK-17 you just installed. If it does exist, simply edit the variable value to the path to the JDK-17 you just installed.

Next look for an environment variable called: "Path", open it up and add the path to the JDK-17 you just installed. If there is any other JDK paths in here, remove them.

Now reboot your device for the changes to take effect.


## Project folder setup
Open explorer and go to your SSD drive (Root). Create a folder where you will be storing the files for your projects (You can attempt to store the project where you usually would but React-Native has a library which checks for the length of file paths which means you need the file path to be as short as possible.).

Open the folder and click the file-path bar, type cmd to open cmd in the current directory.

In your cmd, type `git clone git@github.com:domits1/Domits.git` if you have SSH keys setup for github, otherwise use `git clone https://github.com/domits1/Domits.git`.

Open your project in Android Studio and, if Android Studio automatically generates .idea/misc.xml, type `git stash` in your android studio terminal followed by `git checkout acceptance`. If it doesn't create .idea/misc.xml, no extra action is needed.

---

Alternatively you can use tools such as [git Fork](https://git-fork.com/) to help with cloning and other git actions.

## NodeJs Setup
Download and run the NodeJs installer: `https://nodejs.org/en/download`


## AWS Setup
`For these steps you will need to be added to the Domits-Team on AWS. If you are not added yet, ask Stefan for help or skip these steps for now (Your build will NOT fully run at the end of this guide but you can come back to this later and it will function properly.).`

### You have to do these steps everytime you switch branch or git pull.

Type `cd frontend/app/Domits`

Type `npm install -g @aws-amplify/cli`

To confirm the global install was successful, type `amplify -v`

Delete the existing amplify folder in the app/Domits directory

Type `amplify pull --appId d34jwd0sihmsus --envName develop`

Amplify will open a tab to AWS in your browser, log in with the credentials given to you by Stefan and go back to your android studio.

Use your arrow keys to select the following options. (None (Press enter) -> JavaScript (Press enter) -> React-Native (Press enter) -> (Press enter) -> (Press enter) -> (Press enter) -> (Press enter) -> (Type out) no (Press enter))


## Node_Modules setup
Type `npm install`

After installing all packages, press the shift key two times to open a search pop-up window. Type `frontend\app\Domits\node_modules\react-native\index.js` and open the first result.

Press ctrl + f and lookup: "ViewPropTypes", it will show you a console.error. Comment out the entire getter. (You will have to do this step everytime you run "npm install")


## Testing environment setup
In order to setup your project environment to testing add an .env file in frontend/app/Domits with the following lines:
```
REACT_APP_EXAMPLE=This is an example. Copy + Paste this file in the same directory and remove .example from the file name
REACT_APP_EXAMPLE_EXPLANATION=In React-Native, you need REACT_APP in front of your variables.
REACT_APP_EXAMPLE_RENDERING=Whenever you make changes to .env files. You must run "npx react-native start --reset-cache"
REACT_APP_TESTING=true
```

When you're done testing or **experience issues** with using the right repositories, ensure `REACT_APP_TESTING` is set to `false` and restart your application using `npx react-native start --reset-cache`.

## Final build setup
In Android Studio, go to your 'Device Manager' tab. Click on the '+' followed by 'Create Virtual Device'.

Select the 'Medium Phone' and click 'Next'.

Select the system image with API 34, this will be target Android 14.0 with release name: "UpsideDownCake", and click Next.

Name your emulator if you like and click Finish.

Click the Start button on your emulator and your emulator will start in the 'Running Devices' tab.

In your terminal, type `npx react-native start`. Wait for Metro to start, once you see an option in your terminal saying: "a - run on Android", press: "a".

Now wait for Android Studio to prepare a build and download it on your emulator. This can take quite some time.

## Alternatives to Android Studio
You can also start an AVD (Android Virtual Device) manually in the cmd terminal and use your preferred IDE to start the application.

Open the cmd terminal and go to your following file location by running the following line:
```
cd AppData\Local\Android\Sdk\emulator
```

Check the available emulators with:
```
emulator -list-avds
```

Start your desired emulator with:
```
emulator -writable-system -avd [emulator-name]
```
and replace [emulator-name] with an emulator from the available list.

---

In your IDE, start your application by running the following in Domits/app/Domits:
```
npx react-native run-android
```
