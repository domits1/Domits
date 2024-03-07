import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import SearchBarApp from '../header/SearchBarApp';
import Icon from 'react-native-vector-icons/AntDesign';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import FeatherIcon from 'react-native-vector-icons/Feather';

function Header({ navigation }) {
  return (
    <View style={styles.headerContainer}>
      <SearchBarApp />

      <View style={styles.contentContainer}>
        <View style={styles.squareContainer}>
          <View style={styles.itemContainer}>
            <Icon name="scan1" size={30} color="black" />
            <Text style={styles.itemText}>Scan</Text>
          </View>

          <View style={styles.itemContainer}>
            <FeatherIcon name="dollar-sign" size={30} color="black" />
            <Text style={styles.itemText}>Pay</Text>
          </View>

          <View style={styles.itemContainer}>
            <EntypoIcon name="location" size={30} color="black" />
            <Text style={styles.itemText}>Bookings</Text>
          </View>

          <View style={styles.itemContainer}>
            <EntypoIcon name="wallet" size={30} color="black" />
            <Text style={styles.itemText}>Pocket</Text>
          </View>
        </View>

        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'blue',
    height: 170, 
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
  },
  squareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 900,
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 70,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 12,
  },
  itemText: {
    color: 'black',
    fontFamily: 'MotivaSansRegular.woff'
  },
});

export default Header;
