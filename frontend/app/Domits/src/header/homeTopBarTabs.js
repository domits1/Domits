import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext';
import TranslatedText from '../features/translation/components/TranslatedText';
import {GUEST_BOOKINGS_SCREEN} from '../navigation/utils/NavigationNameConstants';

function HomeTopBarTabs() {
    const navigation = useNavigation();
    const {isAuthenticated} = useAuth();

    const handleBookingsPress = () => {
        navigation.navigate(GUEST_BOOKINGS_SCREEN);
    };

    return (
        <View style={styles.headerContainer}>
            <View style={styles.contentContainer}>
                <View style={styles.squareContainer}>
                    {isAuthenticated && (
                        <TouchableOpacity
                            onPress={handleBookingsPress}
                        style={styles.itemContainer}>
                            <View
                                style={styles.iconContainer}>
                                <Image source={require('../images/icons/app-bookings-icon-black.png')}/>
                            </View>
                            <Text style={styles.itemText}>
                                <TranslatedText textToTranslate={'Bookings'}/>
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        display: 'flex',
    },
    contentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    squareContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 10,
        marginTop: 5,
    },
    itemContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 65,
        height: 65,
        backgroundColor: 'white',
        margin: 2,
        borderRadius: 12,
        marginHorizontal: 15,
        // iOS shadow properties
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.5,
        // Android shadow properties
        elevation: 8,
    },
    itemText: {
        color: 'black',
        fontFamily: 'MotivaSansRegular.woff',
    },
});

export default HomeTopBarTabs;
