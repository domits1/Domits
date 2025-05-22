import {Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import React from "react";
import {useNavigation} from "@react-navigation/native";

const TabItem = (navigationName, itemName) => {
    const navigation = useNavigation();

    return (
        <View>
            <TouchableOpacity
                style={styles.tabItem}
                onPress={() => navigation.navigate(navigationName)}>
                <Text style={styles.tabItemText}>
                    <TranslatedText textToTranslate={itemName}/>
                </Text>
                <MaterialIcons name="chevron-right" size={22} color="#000"/>
            </TouchableOpacity>
        </View>
    )
}

export default TabItem;