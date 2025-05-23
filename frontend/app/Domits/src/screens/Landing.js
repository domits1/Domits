import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Register from './login/screens/register';

const { width } = Dimensions.get('window'); 

const Dashboard = () => {


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>List your <Text style={styles.highlightText}>House</Text></Text>
          <Text style={styles.subHeader}>for free on domits</Text>
          <Text style={styles.description}>
            Hobby or profession, register your property today and start increasing your earning potential,
            revenue, occupancy, and average daily rate.
          </Text>
        </View>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Start hosting</Text>
        </TouchableOpacity>

        <Register />

        <View style={styles.infoContainer}>
          <Text style={styles.thirdHeader}>Hosting on <Text style={styles.highlightText}>Domits</Text> has never been <Text style={styles.highlightText}>easier</Text>.</Text>
          <Text style={styles.textBoldHostDomits}>It only takes 3 steps. </Text>
          <Text style={styles.Numbers}>3.</Text>
          <Text style={styles.textBoldHostDomits}>Receive guests</Text>
          <Text style={styles.text}>Welcome your guests with a warm and personal touch.</Text>
          <Text style={styles.Numbers}>2.</Text>
          <Text style={styles.textBoldHostDomits}>Get paid</Text>
          <Text style={styles.text}>Enjoy fast, easy, and secure payments.</Text>
          <Text style={styles.Numbers}>1.</Text>
          <Text style={styles.textBoldHostDomits}>List your property</Text>
          <Text style={styles.text}>Start earning by listing your property for free in just minutes.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  highlightText: {
    color: '#003366',
  },
  container: {
    alignItems: 'center',
  },
  headerContainer: {
    paddingTop: '20%',
    alignItems: 'center',
    paddingHorizontal: '5%',
    paddingBottom: '3%',
  },
  header: {
    fontSize: 35,
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  singUpContainer:{
    paddingTop: '5%',
    color: 'black',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    width: '100%', 
    alignItems: 'center',
    marginVertical: 5,

  },

  subHeader: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 4,
    textAlign: 'center',
  },
  thirdHeader: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 4,
    textAlign: 'center',
  },
  textBoldHostDomits: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 4,
    textAlign: 'center',
  },
  Numbers: {
    fontSize: 75,
    color: '#003366',
  },
  description: {
    fontWeight: 'bold',
    fontSize: 15,
    color: 'black',
    marginTop: 8,
    maxWidth: '90%',
    paddingHorizontal: '5%',
  },
  button: {
    backgroundColor: '#003366',
    paddingVertical: 10,
    paddingHorizontal: width * 0.10,
    marginVertical: 16,
    borderRadius: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
  label: {
    fontSize: 16,
    color: 'black',
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: '5%',
  },
  input: {
    color: 'black',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    width: '90%', 
    marginVertical: 5,
    borderColor: '#003366',
    borderWidth: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    width: '90%',
  },
  checkboxWrapper: {
    width: '10%', 
  },
  checkboxLabel: {
    fontSize: 16,
    color: 'black',
    marginLeft: 8,
    flexShrink: 1,
  },
  infoContainer: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    width: '100%',
    paddingVertical: 20,
  },
  text: {
    color: 'black',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 2,
    width: '75%',
  },
});

export default Dashboard;
