* [Visual roadmap React Native](https://roadmap.sh/react-native)
* [Visual roadmap iOS](https://roadmap.sh/ios)
* [Visual roadmap Android](https://roadmap.sh/android)
-
* [App Android Setup](android_setup.md)
* [App iOS/macOS Setup](ios_setup.md)
* [App Android/macOS Setup](android_macOS_setup.md)
* [App TestFlight](app_testFlight.md)
* [App iOS xCode issues/Errors](ios_xCode_errors.md)
-
To get started on the app follow this guide first. We use React Native and not expo!

https://reactnative.dev/docs/set-up-your-environment


for android

select a device from device manager and set it up. after doing this you should be able to run npm run android in the /app/domits directory.

for iOS (Mac only)

connect your device or select one from the emulator list. after this you can do npm run iOS in the /app/domits directory OR open Xcode and open the project. go to Product > Run.


Notes for iOS  (IMPORTANT)

if there have been npm package updates on the app make sure to navigate to the /app/domits/iOS directory and run "pod install". this is the equivalent of npm install for iOS.

---
All resources (research) needed for app below

React native:

https://reactnative.dev/docs/getting-started

for Mac devs:

Xcode (to run iOS)

https://apps.apple.com/nl/app/xcode/id497799835?l=en-GB&mt=12

for all devs:

Android Studio (to run Android)

https://developer.android.com/studio

here is the android studio setup

https://reactnative.dev/docs/environment-setup