import React from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import SearchBarApp from './SearchBarApp';
import Icon from 'react-native-vector-icons/AntDesign';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import FeatherIcon from 'react-native-vector-icons/Feather';

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      
      <SearchBarApp />

      
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

      <View style={styles.buttonContainer}>
        <Button
          title="Go to Host Dashboard"
          onPress={() => navigation.navigate('HostDashboard')}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Go to Guest Dashboard"
          onPress={() => navigation.navigate('GuestDashboard')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
  },
  squareContainer: {
    flexDirection: 'row', 
    marginBottom: 400,
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
  },
});

export default HomeScreen;
