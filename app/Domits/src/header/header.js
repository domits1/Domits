import React, {useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext';
import TranslatedText from '../features/translation/components/TranslatedText';
import SelectLanguagePopup from '../features/translation/components/SelectLanguagePopup';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import NavigateTo from "../navigation/NavigationFunctions";

function Header() {
  const navigation = useNavigation();
  const {isAuthenticated} = useAuth();

  const [isLanguagePopupOpen, setIsLanguagePopupOpen] = useState(false);

  const handleBookingsPress = () => {
    NavigateTo(navigation).guestBookings();
  };

  if (isAuthenticated) {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.contentContainer}>
          <View style={styles.squareContainer}>

            <TouchableOpacity
              onPress={handleBookingsPress}
              style={styles.itemContainer}>
              <Image
                source={require('../images/icons/app-bookings-icon-black.png')}
              />
              <Text style={styles.itemText}>
                <TranslatedText textToTranslate={'bookings'} />
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsLanguagePopupOpen(true)}
              style={styles.itemContainer}>
              <MaterialIcons name={'language'} size={45} color={'black'} />
              <Text style={styles.itemText}>
                <TranslatedText textToTranslate={'language'} />
              </Text>
            </TouchableOpacity>
            <SelectLanguagePopup
              isVisible={isLanguagePopupOpen}
              setIsVisible={setIsLanguagePopupOpen}
            />
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  headerContainer: {
    display: 'flex',
    backgroundColor: '#ffffff',
    elevation: 2,
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
    marginTop: 15,
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 12,
    marginHorizontal: 15,
    // iOS shadow properties
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
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
