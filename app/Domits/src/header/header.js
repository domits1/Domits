//header.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView,  } from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import FeatherIcon from 'react-native-vector-icons/Feather';


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
              <Icon name="scan1" size={30} color="black" />
              <Text style={styles.itemText}>Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePayPress} style={styles.itemContainer}>
              <FeatherIcon name="dollar-sign" size={30} color="black" />
              <Text style={styles.itemText}>Pay</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBookingsPress} style={styles.itemContainer}>
              <EntypoIcon name="location" size={30} color="black" />
              <Text style={styles.itemText}>Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePocketPress} style={styles.itemContainer}>
              <EntypoIcon name="wallet" size={30} color="black" />
              <Text style={styles.itemText}>Pocket</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePocketPress} style={styles.itemContainer}>
              <FeatherIcon name="settings" size={30} color="black" />
              <Text style={styles.itemText}>Settings</Text>
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
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
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
