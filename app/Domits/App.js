import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigation from './src/navigation/appNavigation.js';

function App() {
    return (
        <NavigationContainer>
            <AppNavigation />
        </NavigationContainer>
    );
}

export default App;
