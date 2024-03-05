import React from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import SearchBarApp from './SearchBarApp'; 

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      
      <SearchBarApp />

      <Image source={require('./pictures/domits-logo.jpg')} style={styles.logo} />
      <Text style={styles.welcomeText}>
        Welcome to the final product of the <Text style={styles.greenText}>Domits App</Text>
      </Text>

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
    paddingHorizontal: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 100,
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  greenText: {
    color: 'green',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
  },
});

export default HomeScreen;
