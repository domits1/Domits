import React from 'react';
import { View, ScrollView, Text, Image, StyleSheet, TouchableOpacity, Button, SafeAreaView, Linking, Vibration } from 'react-native';
import Header from '../header/header';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

function HomeScreen({ navigation }) {
  const images = [
    require('./pictures/image1.jpg'),
    require('./pictures/image2.jpg'),
    require('./pictures/image3.jpg'),
    require('./pictures/image4.jpg'),
    require('./pictures/image5.jpg'),
    require('./pictures/image6.jpg'),
  ];

  const handleDetailpagePress = () => {
    navigation.navigate('Detailpage');
  };

  const handleLongPress = () => {
    Vibration.vibrate(50);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView stickyHeaderIndices={[0]}>
        <Header />
        <View style={styles.imageContainer}>
          {images.map((image, index) => (
            <TouchableOpacity 
              key={index} 
              onLongPress={handleLongPress}
              onPress={handleDetailpagePress} 
              activeOpacity={1}>
              <Image source={image} style={styles.image} />
              <Text style={styles.imageText}>Kinderhuissingle 6k</Text>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
      
    </SafeAreaView>
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
    marginTop: '0%',
  },
  buttonContainer: {
    marginVertical: 15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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


  bookContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  book: {
    width: 95,
    borderWidth: 1,
    borderColor: '#319914',
    borderRadius: 13,
    padding: 10,
    height: 45,
    backgroundColor: '#319914',
  },
  bookText2: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
    marginRight: 10,
  },
  iconamenities: {

    marginVertical: 1,
  },
});

export default HomeScreen;