import {Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";

const Header = ({handleHomeScreenPress, property}) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={handleHomeScreenPress}>
                <Ionicons
                    name="chevron-back-outline"
                    size={24}
                    style={styles.headerIcon}
                />
            </TouchableOpacity>
            <Text testID={"propertyDetailsTitle"} style={styles.titleText}>{property.property.title}</Text>
        </View>
    )
}

export default Header;