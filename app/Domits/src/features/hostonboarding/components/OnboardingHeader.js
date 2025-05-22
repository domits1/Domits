import {Alert, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";
import {COLORS} from "../../../styles/COLORS";
import TranslatedText from "../../translation/components/TranslatedText";
import {useNavigation} from "@react-navigation/native";
import {useTranslation} from "react-i18next";

const OnboardingHeader = ({headerTitle}) => {
    const navigation = useNavigation();
    const {t} = useTranslation();

    const confirmQuitOnboarding = () => {
        return Alert.alert(
            t("Quit onboarding"),
            t("Are you sure you want to quit adding a property?"),
            [
                {
                    text: t("Yes"),
                    onPress: () => {
                        navigation.goBack()
                    }
                },
                {text: t("No")}
            ]
        )
    }

    return (
        <View>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => confirmQuitOnboarding()}>
                    <Ionicons name="close-outline" size={36} style={styles.closeIcon}/>
                </TouchableOpacity>
                <Text style={styles.titleText} numberOfLines={1}>
                    <TranslatedText textToTranslate={headerTitle}/>
                </Text>
                <View style={styles.rightIcon}/>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 10,
    },
    titleText: {
        textAlign: "center",
        fontSize: 25,
        color: COLORS.domitsHostBlue,
        flex: 15,
    },
    closeIcon: {
        flex: 1,
    },
    rightIcon: {
        flex: 1,
    }
})

export default OnboardingHeader;