import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

const SimulateStripe = ({navigation, route}) => {
  const parsedAccommodation = route.params.parsedAccommodation;
  const calculateCost = route.params.calculateCost;
  const handlePaymentAccepted = () => {
    navigation.navigate('paymentAccepted', {
      parsedAccommodation: parsedAccommodation,
      calculateCost: calculateCost,
    });
  };

  const handlePaymentDeclined = () => {
    navigation.navigate('paymentDeclined', {
      parsedAccommodation: parsedAccommodation,
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.acceptedButton]}
        onPress={handlePaymentAccepted}>
        <Text style={styles.buttonText}>Payment Accepted</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.declinedButton]}
        onPress={handlePaymentDeclined}>
        <Text style={styles.buttonText}>Payment Declined</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  button: {
    width: '80%',
    padding: 20,
    borderRadius: 5,
    marginBottom: 20,
    alignItems: 'center',
  },
  acceptedButton: {
    backgroundColor: '#4CAF50',
  },
  declinedButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SimulateStripe;
