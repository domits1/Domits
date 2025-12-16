import {StyleSheet, TextInput, TouchableOpacity, View, Image} from "react-native";
import {useTranslation} from "react-i18next";
import React from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../context/AuthContext';
import {GUEST_BOOKINGS_SCREEN} from '../../../navigation/utils/NavigationNameConstants';

const Header = ({country, setCountry, loading, onSearchButtonPress, onCancelButtonPress}) => {
    const {t} = useTranslation();
    const navigation = useNavigation();
    const {isAuthenticated} = useAuth();

    return (
        <View style={styles.headerContainer}>
            <View style={styles.contentContainer}>
                {country && (
                    <TouchableOpacity
                        testID="delete-button"
                        disabled={loading}
                        onPress={() => {
                            onCancelButtonPress();
                            setCountry('');
                        }}>
                        <Icon name="delete" size={20} style={styles.leadingIcon}/>
                    </TouchableOpacity>
                )}
                <TextInput
                    testID={"SearchBar"}
                    style={styles.textInput}
                    value={country}
                    onChangeText={setCountry}
                    placeholder={t("Where to")}
                >
                </TextInput>
                <TouchableOpacity
                    testID={"SearchButton"}
                    disabled={loading}
                    onPress={() => onSearchButtonPress(country)}
                >
                    <Icon name={"search"} size={20} style={styles.trailingIcon}/>
                </TouchableOpacity>
            </View>
            {isAuthenticated && (
                <TouchableOpacity
                    style={styles.bookingsButton}
                    onPress={() => navigation.navigate(GUEST_BOOKINGS_SCREEN)}>
                    <Image
                        source={require('../../../images/icons/app-bookings-icon-black.png')}
                        style={{width: 24, height: 24}}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            )}
        </View>
    )
}

export default Header;

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
    },
    contentContainer: {
        flex: 1,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        marginRight: 10,
        // iOS shadow properties
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.5,
        // Android shadow properties
        elevation: 8,
    },
    bookingsButton: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
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