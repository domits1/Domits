import {StyleSheet, TextInput, TouchableOpacity, View} from "react-native";
import {useTranslation} from "react-i18next";
import React from "react";
import Icon from "react-native-vector-icons/MaterialIcons";

const Header = ({country, setCountry, loading, onSearchButtonPress, onCancelButtonPress}) => {
    const {t} = useTranslation();

    return (
        <View style={styles.headerContainer}>
            <View style={styles.contentContainer}>
                {country && (
                    <TouchableOpacity disabled={loading} onPress={() => {
                        onCancelButtonPress()
                        setCountry("")
                    }}>
                        <Icon name={"delete"} size={20} style={styles.leadingIcon} />
                    </TouchableOpacity>
                )}
                <TextInput
                    style={styles.textInput}
                    value={country}
                    onChangeText={setCountry}
                    placeholder={t("Where to")}
                >
                </TextInput>
                <TouchableOpacity disabled={loading} onPress={() => onSearchButtonPress(country)}>
                    <Icon name={"search"} size={20} style={styles.trailingIcon} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default Header;

const styles = StyleSheet.create({
    headerContainer: {
        display: 'flex',
    },
    contentContainer: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 10,
        borderRadius: 12,
        marginHorizontal: 25,
        marginTop: 20,
        // iOS shadow properties
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.5,
        // Android shadow properties
        elevation: 8,
    },
    textInput: {
        marginHorizontal: 20,
        flex: 1
    },
    trailingIcon: {
        justifyContent: "flex-end",
        marginRight: 15,
        color: '#000'
    },
    leadingIcon: {
        justifyContent: "flex-start",
        marginLeft: 15,
        color: '#000',
    }
})