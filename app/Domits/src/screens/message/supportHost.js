import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Support = () => {
  return (
    <View style={styles.container}>
      <Text>Host Support Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Support;
