# Troubleshooting xCode
Recorded issues with xCode and their solutions.

# Table of contents
<!-- TOC -->
  * [Xcode delegate file not found error](#xcode-delegate-file-not-found-error)
  * [Xcode CacheLocality Static assertion failed due to requirement error](#xcode-cachelocality-static-assertion-failed-due-to-requirement-error)
  * [AnimatedSensorModule error](#animatedsensormodule-error)
  * [React-RCTFabric Problem](#react-rctfabric-problem)
  * [MsghandlingError PIF Problem](#msghandlingerror-pif-problem)
  * [react-native-maps problem](#react-native-maps-problem)
<!-- TOC -->

---

## Xcode delegate file not found error
There could be a problem that occurs out of nowhere in Xcode that says: delegate file not found. and as long as this error occurs your not able to build de simulator or publish the app file into testflight.

**_Solution_**  
- Reinstall Xcode and the pods
- Eventually uninstall gem and ruby and re-download all of it. Give full disc permission in the terminal
- After the full disc permission the pod install might perform the actual installation.
- After everything was done you might get a flipper error: but the flipper error was easily solved by running `export NO_FLIPPER=1` -
  `cd ios` - `pod install`
- After following these steps, go to Xcode, click on Product and then Clean Build Folder.
- Then click on Product again and select Build, and that should solve the issue.


## Xcode CacheLocality Static assertion failed due to requirement error
You can possible get this error after xml or npm changes,the cause is not clear
![Screenshot 2024-11-04 at 15 08 44](https://github.com/user-attachments/assets/283251c1-7266-405c-b13a-45212769a9c6)

**_Solution_**  
First execute `export NO_FLIPPER=1` in the domits/app/domits folder the `cd ios` and run: `rm -rf Podfile.lock` and `rm -rf Pods`. after you have removed both files run: `pod install` also inside the ios folder

## AnimatedSensorModule error
After changing some aws-amplify packages in package.json, this error could pop up when trying to start up Xcdoe.
<img width="801" alt="image" src="https://github.com/user-attachments/assets/b8401a8c-b997-4278-b2e0-eb79b83067f1">

**_Solution_**  
First of all revert all the changes back though your code editor. After you have reverted the changed back (package.json) you go to the `ios` folder and run `pod install --repo-update` in the terminal.

After you run the line in the terminal most there might be chance that this error pops up (after you try to start Xcode again):
<img width="811" alt="image" src="https://github.com/user-attachments/assets/feecd718-fb13-43d6-901c-386da4f425a6">
but this error basicaly means that you have to clear the build and rebuild in xcode.

as a last step it might complain about flipper again but for this issue you just run (cd .. out of ios folder) `export NO_FLIPPER=1` then you `cd ios` and finally run `pod install`


## React-RCTFabric Problem
<img width="705" alt="Screenshot 2024-12-03 at 14 42 39" src="https://github.com/user-attachments/assets/7c0c07b7-e0d0-412e-8c56-5e675fed4a19">

**_Solution_**  
First go into the Domits/app/Domits folder and delete the `node_modules` folder. After you have deleted the node_modules run `npm install`, right after run `cd iOS` and run `pod install`. After all the runs go to Xcode and press `product` and clear the build, after the build is cleared you build it again.

There might be a chance you get the cache loyalty problem but then you can check that also in here (above this problem there should be a cache loyalty problem (See problem above)

as a last step it might complain about flipper again but for this issue you just run (cd .. out of ios folder) `export NO_FLIPPER=1` then you `cd ios` and finally run `pod install`

## MsghandlingError PIF Problem
<img width="468" alt="image" src="https://github.com/user-attachments/assets/79b95693-8fe8-4eab-9472-aff5051ae8d3" />

**_Solution_**  
If you encounter this problem you just simply close Xcode through force quit, restart it, then go to product clean the build and build it again.

## react-native-maps problem
<img width="590" alt="Screenshot 2025-01-29 at 11 12 54" src="https://github.com/user-attachments/assets/c212e52b-7b3e-4116-8581-016bfc05d16c" />

**_Solution_**  
1. go to the cd domits/app/domits
2. remove the node modules folder: `rm -rf node_modules package-lock.json` if this doesn't work then remove the folder manually from the directories.
3. `npm install` in the terminal
4. `cd ios` -> `rm -rf Pods Podfile.lock` -> `pod install`
5. xcode might give the MsghandlingError PIF Problem (follow the instruction above at MsghandlingError PIF Problem)
6. the last error xcode might be able to give is kcpplibver if this occurs proceed to step 7 else your done.
7. `cd ios` -> `export NO_FLIPPER=1` -> `pod install`

