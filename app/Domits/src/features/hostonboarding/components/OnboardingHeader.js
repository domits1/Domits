import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";
import {COLORS} from "../../../styles/COLORS";
import TranslatedText from "../../translation/components/TranslatedText";

const OnboardingHeader = ({headerTitle}) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity>
                <Ionicons name="chevron-back-outline" size={24} style={styles.navIcon}/>
            </TouchableOpacity>
            <View style={styles.progressContainer}>
                    <Text style={styles.titleText} numberOfLines={1}>
                        <TranslatedText textToTranslate={headerTitle}/>
                    </Text>
                    <TouchableOpacity>
                        <Ionicons name="chevron-down-outline" size={24} style={styles.progressIcon}/>
                    </TouchableOpacity>
            </View>
            <TouchableOpacity>
                <Ionicons name="chevron-forward-outline" size={24} style={styles.navIcon}/>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 20,
        marginBottom: 10,
        marginHorizontal: 20,
    },
    progressContainer: {
        flexDirection: "row",
        gap: 5,
        alignItems: "center",
        flexShrink: 1,
        paddingHorizontal: 15,
    },

    titleText: {
        textAlign: "center",
        fontSize: 25,
        color: COLORS.domitsHostBlue,
        flexShrink: 1,
    },
    // Icons
    progressIcon: {
        color: COLORS.domitsHostBlue,
    },
    navIcon: {
        flex: 1,
        verticalAlign: "middle",
        color: "rgba(124,124,124,0.75)",
    },
})

export default OnboardingHeader;