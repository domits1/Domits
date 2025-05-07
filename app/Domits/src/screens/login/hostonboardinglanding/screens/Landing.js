import React from 'react';
import {Dimensions, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Register from '../../register/screens/register';
import {styles} from '../styles/HostOnboardingLandingStyles';

const { width } = Dimensions.get('window');

const HostOnboardingLanding = () => {
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
        <TouchableOpacity style={[styles.button, {paddingHorizontal: width * 0.10}]}>
          <Text style={styles.buttonText}>Start hosting</Text>
        </TouchableOpacity>

        <Register />

        <View style={styles.infoContainer}>
          <Text style={styles.thirdHeader}>Hosting on <Text style={styles.highlightText}>Domits</Text> has never been <Text style={styles.highlightText}>easier</Text>.</Text>
          <Text style={styles.textBoldHostDomits}>It only takes 3 steps.</Text>
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

export default HostOnboardingLanding;
