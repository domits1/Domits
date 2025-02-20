import React from 'react'
import {View, ScrollView, StyleSheet, Button, SafeAreaView} from 'react-native'
import Header from '../header/header'
import Accommodations from './Acommodations' // Import the new component

function HomeScreen({navigation}) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView stickyHeaderIndices={[0]}>
        <Header />
        <Accommodations />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
})

export default HomeScreen
