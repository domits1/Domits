import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIconsIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import IoniconsIcon from 'react-native-vector-icons/Ionicons';

function Header() {
  const navigation = useNavigation();

  const handleScanPress = () => {
    navigation.navigate('Scan');
  };

  const handlePayPress = () => {
    navigation.navigate('Pay');
  };

  const handleBookingsPress = () => {
    navigation.navigate('Bookings');
  };

  const handlePocketPress = () => {
    navigation.navigate('Pocket');
  };

  return (
      <View style={styles.headerContainer}>
        <View style={styles.contentContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.squareContainer}>
              <TouchableOpacity onPress={handleScanPress} style={styles.itemContainer}>
                <MaterialCommunityIconsIcon name="qrcode-scan" size={30} color="black" />
                <Text style={styles.itemText}>Scan</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePayPress} style={styles.itemContainer}>
                <FontAwesome5Icon name="money-bill-wave" size={30} color="black" />
                <Text style={styles.itemText}>Pay</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleBookingsPress} style={styles.itemContainer}>
                <EntypoIcon name="location" size={30} color="black" />
                <Text style={styles.itemText}>Bookings</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePocketPress} style={styles.itemContainer}>
                <IoniconsIcon name="wallet-outline" size={30} color="black" />
                <Text style={styles.itemText}>Pocket</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  squareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 75,
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
  },
  itemText: {
    color: 'black',
    fontFamily: 'MotivaSansRegular.woff'
  },
});

export default Header;
