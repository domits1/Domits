import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {AuthProvider} from './src/context/AuthContext'; // Import AuthProvider from the context
import BottomTabNavigator from './src/navigation/appNavigation';
import InitializeI18n from "./src/features/translation/services/TranslatorInit";
import {
    View,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import SplashScreen from "react-native-splash-screen"
import {StripeProvider} from "@stripe/stripe-react-native";

function App() {
    const [isI18nInitialized, setIsI18nInitialized] = React.useState(false);

    useEffect(() => {
        const init = async () => {
            await InitializeI18n();
            setIsI18nInitialized(true);
            SplashScreen.hide()
        };
        init();
    }, []);

    if (!isI18nInitialized) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff"/>
            </View>
        );
    } else {
        return (
            <StripeProvider
                publishableKey={
                    'pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4qL8dXvk00sxduWZd3'
                }
                urlScheme={'com.domits.domits'}
            >
                <AuthProvider>
                    <NavigationContainer>
                        <BottomTabNavigator/>
                    </NavigationContainer>
                </AuthProvider>
            </StripeProvider>
        );
    }
}

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})

export default App;
