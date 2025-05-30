import Icon from "react-native-vector-icons/Ionicons";
import {View, TouchableOpacity, StyleSheet} from "react-native";
import React from "react";

const Header = ({navigation}) => {
    return (
        <View style={headerStyles.headerContainer}>
            <TouchableOpacity
                style={headerStyles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Icon
                    name="chevron-back-outline"
                    size={30}
                    color="white"
                />
            </TouchableOpacity>
        </View>
    )
}

const headerStyles = StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: 10,
        paddingHorizontal: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default Header;