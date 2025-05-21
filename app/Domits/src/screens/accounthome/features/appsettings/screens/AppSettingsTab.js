import {SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/AppSettingsStyles";
import React, {useState} from "react";
import TabHeader from "../../../components/TabHeader";
import TranslatedText from "../../../../../features/translation/components/TranslatedText";
import SelectLanguagePopup from "../../../../../features/translation/components/SelectLanguagePopup";

const AppSettingsTab = ({}) => {
    const [isLanguagePopupOpen, setIsLanguagePopupOpen] = useState(false);

    return (
        <SafeAreaView style={styles.areaContainer}>
            <ScrollView style={styles.scrollContainer}>
                <TabHeader tabTitle={"App settings"}/>

                <View style={styles.items}>
                    <TouchableOpacity
                        onPress={() => setIsLanguagePopupOpen(true)}
                        style={styles.listItem}>
                        <Text style={styles.listItemText}>
                            <TranslatedText textToTranslate={'Language'}/>
                        </Text>
                    </TouchableOpacity>
                    <SelectLanguagePopup
                        isVisible={isLanguagePopupOpen}
                        setIsVisible={setIsLanguagePopupOpen}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default AppSettingsTab;