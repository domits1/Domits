import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from "react-native-safe-area-context";
import TabHeader from "../accounthome/components/TabHeader";

const GuestPaymentsTab = () => {
  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <TabHeader tabTitle={'Payment methods'}/>
        <Text style={styles.description}>
          Add and/or delete your payment methods.
        </Text>

        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Mastercard</Text>
          <Text style={styles.cardType}>Credit Card</Text>
          <Text style={styles.cardDetails}>0123 4567 8901 2345</Text>
          <Text style={styles.cardUser}>L Summer</Text>
          <Text style={styles.cardExpiry}>04/12</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Text>Change</Text>
              <MaterialIcons name="chevron-right" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text>Delete</Text>
              <MaterialIcons name="chevron-right" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Domits Coins</Text>
          <Text style={styles.cardType}>Credits</Text>
          <Text style={styles.cardDetails}>700 Domits coins</Text>
          <Text style={styles.cardExpiry}>Valid until 04/12/2025</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Text>Change</Text>
              <MaterialIcons name="chevron-right" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text>Delete</Text>
              <MaterialIcons name="chevron-right" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 20,
  },
  cardContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardType: {
    fontSize: 14,
    color: 'gray',
  },
  cardDetails: {
    fontSize: 16,
    letterSpacing: 2,
    marginVertical: 5,
  },
  cardUser: {
    fontSize: 16,
  },
  cardExpiry: {
    fontSize: 16,
    color: 'gray',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default GuestPaymentsTab;
