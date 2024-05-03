// App.js
import React from 'react';
import { Amplify } from 'aws-amplify';
import amplifyconfig from './src/amplifyconfiguration.json';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigation from './src/navigation/appNavigation.js';
// import Header from './src/header/header.js';

Amplify.configure(amplifyconfig);
function App() {
  return (
    <NavigationContainer>
    
      <AppNavigation />
    </NavigationContainer>
  );
}

export default App;