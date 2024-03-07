import React from 'react';
import { View, StyleSheet, Image, ScrollView, Text } from 'react-native';
import Header from '../header/header';
import SearchBarApp from '../header/SearchBarApp';

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
      <ScrollView
        stickyHeaderIndices={[0]} 
      >
        <Header />

        <View style={styles.imageContainer}>
          {images.map((image, index) => (
            <View key={index}>
              <Image source={image} style={styles.image} />
              <Text style={styles.imageText}>Kinderhuissingle 6k </Text>
              <Text style={styles.imageText}>Host: Iemand </Text>
            </View>
          ))}
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
  image: {
    width: '100%',
    height: 250,
    marginBottom: 20,
    marginRight: 5,
    borderRadius: 15,
  },
  imageText: {
    textAlign: 'left',
    marginTop: 10,
    color: 'black',
  },
});

export default HomeScreen;