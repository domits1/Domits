/**
 * @format
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {Amplify} from 'aws-amplify';
import awsconfig from './src/aws-exports.js';
import aws from 'aws-sdk';

export const cognitoClient = new aws.CognitoIdentityServiceProvider();

Amplify.configure(awsconfig);

AppRegistry.registerComponent(appName, () => App);
