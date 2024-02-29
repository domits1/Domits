import React from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';

function HomeScreen({navigation}) {
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welkom bij het eindproduct van de Domits App</Text>

      <Button
        title="Go to Host Dashboard"
        onPress={() => navigation.navigate('HostDashboard')}
      />
      <Button
        title="Go to Guest Dashboard"
        onPress={() => navigation.navigate('GuestDashboard')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
  },
});

export default HomeScreen;