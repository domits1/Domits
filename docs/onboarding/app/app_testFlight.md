Part of this documentation is only for MacOS.

To be done on Mac:

To get the app on TestFlight you need to have Xcode, make sure the build runs first by running Command + R or going to product > run. Once you confirm that the build runs you go to Product > Archive, after the build completes you can select where to distribute the app, select TestFlight and then press distribute app.

Can be done on other OS:

Once you've gotten a build on TestFlight you first need to validate it on appstoreconnect. Once you get access to appstoreconnect you go to Apps > Domits. Here you can see the build you just distributed, sign the compliance and the build should be updated on TestFlight in a few minutes.


For App Store live submission:

Follow the same process in Xcode however select appstoreconnect instead of TestFlight when you have to choose where to distribute.
We submitted a request and it got rejected. Make sure that there is no empty features on the app, so remove any unnecessary frontend that has no functionality. Also provide a working test account for the reviewers to be able to log into.