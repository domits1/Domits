/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {Amplify, Auth} from 'aws-amplify';
import awsconfig from './aws-exports';
import aws from 'aws-sdk';

export const cognitoClient = new aws.CognitoIdentityServiceProvider();

Amplify.configure(awsconfig);
Auth.configure(awsconfig);
AppRegistry.registerComponent(appName, () => App);
