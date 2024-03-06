import React from 'react';
import { View, StyleSheet } from 'react-native';
import Header from '../header/header.js';

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Header />
      {/* Voeg hier andere scherminhoud toe */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', // Achtergrondkleur van het hele scherm
  },
});

export default HomeScreen;