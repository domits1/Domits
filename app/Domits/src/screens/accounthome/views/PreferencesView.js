import {Text, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import TabItem from "../components/TabItem";
import {APP_SETTINGS_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import React from "react";

const PreferencesView = ({userRole, roles}) => {
    return (
        <View>
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Preferences"}/></Text>
                {TabItem(APP_SETTINGS_SCREEN, 'Settings')}
            </View>
        </View>
    )
}

export default PreferencesView;