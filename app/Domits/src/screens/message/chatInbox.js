import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';


  const Inbox = () => {
    return (
      <View style={styles.container}>
        <Text>No contacts</Text>
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

export default Inbox;
