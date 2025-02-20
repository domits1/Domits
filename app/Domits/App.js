import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext'; // Import AuthProvider from the context
import BottomTabNavigator from './src/navigation/appNavigation'; // Adjust the import if necessary

function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <BottomTabNavigator />
            </NavigationContainer>
        </AuthProvider>
    );
}

export default App;
