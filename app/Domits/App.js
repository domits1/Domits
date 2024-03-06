import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigation from './src/navigation/appNavigation.js';
import BottomTabNavigator from './src/components/BottomTabNavigator'

function App() {
    return (
        <NavigationContainer>
            <BottomTabNavigator />
        </NavigationContainer>
    );
}

export default App;
