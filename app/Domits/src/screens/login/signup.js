import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const SignupScreen = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.head}>
        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => navigation.navigate('Account')}>
          <Text style={styles.btnText1}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Create account</Text>
      </View>
      <View>
        <Text style={styles.centeredText}>Welcome to Domits!</Text>
        <Text style={styles.centeredText}>Let's get started,</Text>
        <Text style={styles.centeredTextSmall}>
          Tap 'Host' if you want to rent out. Tap 'Traveler'
          if you want to book
        </Text>
        <TouchableOpacity style={styles.travelerBtn}>
          <Text style={styles.btnText2}>Traveler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.hostBtn}>
          <Text style={styles.btnText2}>Host</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  head: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 15,
    paddingBottom: 5,
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginBottom: 75,
  },
  header: {
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 100,
    color: 'black',
  },
  returnBtn: {
    width: 50,
  },
  btnText1: {
    fontWeight: 'bold',
    color: '#0D9813',
    paddingLeft: 20,
    fontSize: 20,
    borderRadius: 15,
  },
  centeredText: {
    marginTop: 50,
    marginBottom: 100,
    textAlign: 'center',
    color: 'black',
    fontSize: 20,
  },
  centeredTextSmall: {
    padding: 20,
    textAlign: 'center',
    color: 'black',
    fontSize: 15,
  },
  travelerBtn: {
    alignSelf: 'center',
    backgroundColor: '#0D9813',
    padding: 10,
    width: 250,
    marginBottom: 15,
    borderRadius: 10,
  },
  hostBtn: {
    alignSelf: 'center',
    backgroundColor: '#003366',
    padding: 10,
    width: 250,
    borderRadius: 10,
  },
  btnText2: {
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
});
export default SignupScreen;
