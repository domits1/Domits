import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext';
import TranslatedText from "../features/translation/components/TranslatedText";

function Header() {
  const navigation = useNavigation();
  const {isAuthenticated} = useAuth();

    const handleBookingsPress = () => {
        navigation.navigate('Bookings');
    };
  if (isAuthenticated) {
    return (
        <View style={styles.headerContainer}>
          <View style={styles.contentContainer}>
            <View style={styles.squareContainer}>
              <TouchableOpacity
                  onPress={handleBookingsPress}
                  style={styles.itemContainer}>
                <Image source={require('../images/icons/app-bookings-icon-black.png')}/>
                <Text style={styles.itemText}><TranslatedText textToTranslate={'bookings'} /></Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
    );
  }
}

const styles = StyleSheet.create({
    headerContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        elevation: 2,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    squareContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 10,
        marginTop: 15,
    },
    itemContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 64,
        height: 64,
        backgroundColor: 'white',
        margin: 10,
        borderRadius: 12,
        marginHorizontal: 15,
        // iOS shadow properties
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        // Android shadow properties
        elevation: 2,
    },
    itemText: {
        color: 'black',
        fontFamily: 'MotivaSansRegular.woff',
    },
});

export default Header;
