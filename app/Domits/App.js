// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigation from './src/navigation/appNavigation.js';
// import Header from './src/header/header.js';
function App() {
  return (
    <NavigationContainer>
    
      <AppNavigation />
    </NavigationContainer>
  );
}

export default App;