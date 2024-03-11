import React from 'react';
import {
  View,
  ScrollView,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Button, // Add Button here
} from 'react-native';
import Header from '../header/header';
import SearchBarApp from '../header/SearchBarApp';

function HomeScreen({navigation}) {
  const images = [
    require('./pictures/image1.jpg'),
    require('./pictures/image2.jpg'),
    require('./pictures/image3.jpg'),
    require('./pictures/image4.jpg'),
  ];

  const handleDetailpagePress = () => {
    navigation.navigate('onBoarding1');
  };

  return (
    <View style={styles.container}>
      <SearchBarApp />
      <ScrollView stickyHeaderIndices={[0]}>
        <Header />
        <View style={styles.imageContainer}>
          {images.map((image, index) => (
            <TouchableOpacity key={index} onPress={handleDetailpagePress}>
              <Image source={image} style={styles.image} />
              <Text style={styles.imageText}>Kinderhuissingle 6k</Text>

              <View
                style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={styles.imageText}>Host: Unknown</Text>
                <Text
                  style={[
                    styles.imageText,
                    {
                      fontFamily: 'MotivaSansBold.woff',
                      textDecorationLine: 'underline',
                    },
                  ]}>
                  $400 Night
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Go to Host Dashboard"
            onPress={() => navigation.navigate('HostDashboard')}
          />
          <Button
            title="Go to Guest Dashboard"
            onPress={() => navigation.navigate('GuestDashboard')}
          />
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
    padding: 15,
    marginTop: '0%',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
    justifyContent: 'space-between',
  },
  squareContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
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
    marginVertical: 20,
  },
  imageText: {
    textAlign: 'left',
    marginTop: 0,
    color: 'black',
    fontFamily: 'MotivaSansRegular.woff',
  },
});

export default HomeScreen;
