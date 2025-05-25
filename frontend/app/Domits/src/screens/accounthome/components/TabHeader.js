import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import React from "react";
import {useNavigation} from "@react-navigation/native";

const TabHeader = ({tabTitle}) => {
    const navigation = useNavigation()

    const handleGoBack = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.leftIcon}>
                <Ionicons name="chevron-back-outline" size={24} style={styles.headerIcon}/>
            </TouchableOpacity>
            <Text style={styles.titleText} numberOfLines={2}>
                <TranslatedText textToTranslate={tabTitle}/>
            </Text>
            <View style={styles.rightIcon}/>
        </View>
    )
}

TabHeader.defaultProps = {
    tabTitle: null,
}

const styles = StyleSheet.create({
    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 10,
    },
    leftIcon: {
        flex: 1,
    },
    rightIcon: {
        flex: 1,
    },
    titleText: {
        flex: 15,
        textAlign: "center",
        fontSize: 30,
        color: "black",
        fontWeight: 'bold',
    },
    headerIcon: {
        color: "black",
    },
})

export default TabHeader;