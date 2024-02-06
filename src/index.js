// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify, Auth } from 'aws-amplify';
import aws from 'aws-sdk';
import awsExports from './aws-exports';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
import ConfirmEmail from "./components/base/ConfirmRegister";
export let AWS_SDK_LOAD_CONFIG;
AWS_SDK_LOAD_CONFIG=1

const awsConfig = {
    region: awsExports.aws_project_region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

aws.config.update(awsConfig);

export const cognitoClient = new aws.CognitoIdentityServiceProvider();

Amplify.configure(awsExports);
Auth.configure(awsExports);

// Define your UserPoolId here
export const userPoolId = 'eu-north-1_HjL3yKPeV';

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
