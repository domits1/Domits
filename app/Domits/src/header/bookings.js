import React from 'react'
import {View, Text, StyleSheet} from 'react-native'

const Bookings = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No Bookings</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: '15%',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 50,
  },
})

export default Bookings
