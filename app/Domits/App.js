import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext'; // Import AuthProvider from the context
import BottomTabNavigator from './src/navigation/appNavigation';
import i18n from './src/features/translation/services/TranslatorInit';

function App() {
    const initI18n = i18n
    return (
        <AuthProvider>
            <NavigationContainer>
                <BottomTabNavigator />
            </NavigationContainer>
        </AuthProvider>
    );
}

export default App;
