import React from 'react';
import { View, StyleSheet } from 'react-native';
import Header from '../header/header.js';

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Header />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', 
  },
});

export default HomeScreen;