import {StyleSheet, TouchableOpacity, View} from "react-native";
import SelectLanguagePopup from "../../../../features/translation/components/SelectLanguagePopup";
import React, {useState} from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import {COLORS} from "../../../../styles/COLORS";

const ChangeLanguageView = () => {
    const [isLanguagePopupOpen, setIsLanguagePopupOpen] = useState(false);

    return (
        <View style={styles.languageIconContainer}>
            <TouchableOpacity
                onPress={() => setIsLanguagePopupOpen(true)}>
                <Icon name={"translate"} size={30} style={styles.languageIcon}/>
            </TouchableOpacity>
            <SelectLanguagePopup
                isVisible={isLanguagePopupOpen}
                setIsVisible={setIsLanguagePopupOpen}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    languageIconContainer: {
        width: "100%",
        flexDirection: 'row-reverse'
    },
    languageIcon: {
        color: COLORS.domitsHostBlue
    }
})

export default ChangeLanguageView;