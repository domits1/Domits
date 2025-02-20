import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'

const HostPaymentsTab = () => {
  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Payments</Text>
        </View>
        <View style={styles.boxColumns}>
          <View style={styles.box}>
            <Text style={styles.boxText}>Completed Payments</Text>
            <Text>Payment Info</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxText}>Pending Payments</Text>
            <Text>Payment Info</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxText}>Cancelled Payments</Text>
            <Text>Payment Info</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxText}>Open Payments</Text>
            <Text>Payment Info</Text>
          </View>

          <View style={styles.boxRows}>
            <View style={[styles.box, styles.halfBox]}>
              <Text style={styles.boxText}>Payments</Text>
              <Text>Payment Info</Text>
            </View>
            <View style={[styles.box, styles.halfBox]}>
              <Text style={styles.boxText}>Payments</Text>
              <Text>Payment Info</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 30,
    marginTop: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  boxColumns: {
    margin: 10,
    flexDirection: 'column',
  },
  boxRows: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfBox: {
    flex: 1,
  },
  box: {
    elevation: 1,
    shadowColor: '#003366',
    padding: 10,
    margin: 10,
    minHeight: 150,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#003366',
  },
  boxText: {
    borderWidth: 1,
    borderColor: '#003366',
    borderRadius: 15,
    padding: 5,
  },
})

export default HostPaymentsTab
