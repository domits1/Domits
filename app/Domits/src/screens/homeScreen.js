import React from 'react';
import {View, ScrollView, StyleSheet, Button, SafeAreaView} from 'react-native';
import Header from '../header/header';
import Accommodations from '../components/Acommodations'; // Import the new component

function HomeScreen({navigation}) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView stickyHeaderIndices={[0]}>
        <Header />
        <Accommodations />
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
  buttonContainer: {
    marginVertical: 15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default HomeScreen;
