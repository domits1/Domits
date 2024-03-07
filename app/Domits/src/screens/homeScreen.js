import React from 'react';
import { View, ScrollView, Text, Image, StyleSheet, Button } from 'react-native';
import Header from '../header/header';
import SearchBarApp from '../header/SearchBarApp';
import Icon from 'react-native-vector-icons/AntDesign'; // Make sure to import the necessary icon libraries
import FeatherIcon from 'react-native-vector-icons/Feather';
import EntypoIcon from 'react-native-vector-icons/Entypo';

function HomeScreen({ navigation }) {
  const images = [
    require('./pictures/image1.jpg'),
    require('./pictures/image2.jpg'),
    require('./pictures/image3.jpg'),
    require('./pictures/image4.jpg'),
  ];

  return (
    <View style={styles.container}>
      <SearchBarApp />
      <ScrollView stickyHeaderIndices={[0]}>
        <Header />
        {/* Display the list of images here */}
        <View style={styles.imageContainer}>
          {images.map((image, index) => (
            <View key={index} style={{ marginBottom: 20 }}>
              <Image source={image} style={styles.image} />
              <Text style={styles.imageText}>Kinderhuissingle 6k</Text>
              <Text style={styles.imageText}>Host: Iemand</Text>
            </View>
          ))}
        </View>
        {/* Action items container starts here */}
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
        <Image source={require('./pictures/domits-logo.jpg')} style={styles.logo} />
        <Text style={styles.welcomeText}>Welcome to the final product of the Domits App</Text>
        <View style={styles.buttonContainer}>
          <Button title="Go to Host Dashboard" onPress={() => navigation.navigate('HostDashboard')} />
          <Button title="Go to Guest Dashboard" onPress={() => navigation.navigate('GuestDashboard')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  imageContainer: {
    flexDirection: 'column',
    padding: 10,
    marginTop: '10%',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
  },
  squareContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20, // Adjusted for better button visibility
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
  image: {
    width: '100%',
    height: 250,
    borderRadius: 15,
  },
  imageText: {
    textAlign: 'left',
    marginTop: 10,
    color: 'black',
  },
  logo: {
    width: '100%',
    height: 100, // Adjusted for visibility
    resizeMode: 'contain', // Ensure the logo is fully visible
    marginVertical: 20, // Add some vertical space around the logo
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 10,
  },
  // Add styles for itemText, assumed missing in provided code
  itemText: {
    marginTop: 5,
    color: 'black',
  },
});

export default HomeScreen;
