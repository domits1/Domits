/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {Amplify, Auth } from 'aws-amplify';
import awsExports from './src/aws-exports';
 
Amplify.configure(awsExports);

AppRegistry.registerComponent(appName, () => App);
