import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView} from 'react-native';
import TabHeader from "../../accounthome/components/TabHeader";

const GuestBookings = () => {
  return (
      <SafeAreaView style={styles.areaContainer}>
        <ScrollView style={styles.scrollContainer}>
          <TabHeader tabTitle={"Bookings"}/>

          <View style={styles.bodyContainer}>
            <Text> No Bookings </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  bodyContainer: {
    marginTop: '15%',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default GuestBookings;
