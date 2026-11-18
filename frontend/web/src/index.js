import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify, Auth } from 'aws-amplify';
import awsExports from './aws-exports';
import './styles/sass/app.scss';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
import './fonts/kanit/Kanit-Regular.ttf';
import LanguageContextProvider from './context/LanguageContext.js'

// DONT TOUCH THIS!
Amplify.configure(awsExports);
Auth.configure(awsExports);
// DONT TOUCH THIS ^^

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <LanguageContextProvider>
            <App />
        </LanguageContextProvider>
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

