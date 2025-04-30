import {ActivityIndicator, StyleSheet, Text, View} from "react-native";
import React from "react";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import {COLORS} from '../../../styles/COLORS';

/**
 * Loading screen with indicator
 * @param loadingName - Optional text for what is loading
 * @returns a view
 * @constructor
 */
const LoadingScreen = ({loadingName}) => {
     return (
        <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.domitsGuestGreen}/>
            <Text style={styles.loadingText}>
                <TranslatedText textToTranslate={"loading"}/> <TranslatedText textToTranslate={loadingName}/>
            </Text>
        </View>
    )
}

// Default props (if no loadingName is provided)
LoadingScreen.defaultProps = {
    loadingName: null,
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        margin: 10,
    }
})

export default LoadingScreen;