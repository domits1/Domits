import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const Listings = () => {
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.listItem}>
        <Text style={styles.listItemText}>Add new accommodation</Text>
        <MaterialIcons name="chevron-right" size={22} color="#000" />
      </TouchableOpacity>
      <View style={styles.boxColumns}>
        <View style={styles.box}>
          <Text style={styles.boxText}>Current Listings</Text>
          <Text>Listings Info</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxText}>Pending</Text>
          <Text>Listings Info</Text>
        </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  boxColumns: {
    margin: 10,
    flexDirection: 'column',
  },
  box: {
    elevation: 1,
    shadowColor: '#003366',
    padding: 10,
    margin: 10,
    minHeight: 350,
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#003366',
    margin: 20,
    marginBottom: 0,
    marginTop: 30,
  },
  listItemText: {
    fontSize: 18,
    color: '#003366',
  },
});


export default Listings;
