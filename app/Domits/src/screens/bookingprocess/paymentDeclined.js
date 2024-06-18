import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';

const BookingDeclinedPage = ({navigation}) => {
  const handleGoBack = () => {
    navigation.navigate('finalBookingOverview');
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back-outline" size={30} color="#000" />
        </TouchableOpacity>

        <View style={styles.declinedContainer}>
          <Icon name="alert-circle" size={22} color="#FFFFFF" />
          <Text style={styles.declinedTitle}>Something went wrong.</Text>
          <Text style={styles.declinedSubtitle}>
            No money was deducted from
          </Text>
          <Text style={styles.cardInfo}>
            Mastercard [ L.Summer ] [0123 xxxx xxxx 2345]
          </Text>
        </View>

        {/* Price details code from your previous BookingConfirmationPage component goes here */}
        <View style={styles.priceDetailsContainer}>
          <Text style={styles.priceDetailsTitle}>Price details</Text>
          <Text style={styles.priceDetailsText}>
            2 adults - 2 kids | 3 nights
          </Text>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>$140 night x 3</Text>
            <Text style={styles.priceValue}>$420.00</Text>
          </View>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>Cleaning fee</Text>
            <Text style={styles.priceValue}>$50.00</Text>
          </View>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>Cat tax</Text>
            <Text style={styles.priceValue}>$17.50</Text>
          </View>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>Domits service fee</Text>
            <Text style={styles.priceValue}>$39.50</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total (DOL)</Text>
            <Text style={styles.totalAmount}>$527.00</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreInfoButton}>
          <Text style={styles.moreInfoText}>More information</Text>
        </TouchableOpacity>

        <View style={styles.propertyDetailsContainer}>
          {/* Property details code from your previous BookingConfirmationPage component goes here */}
          <Text style={styles.propertyTitle}>Kinderhuissingel 6k</Text>
          <Text style={styles.propertyDescription}>
            Fantastic villa with private swimming pool and surrounded by
            beautiful parks.
          </Text>
        </View>

        <TouchableOpacity onPress={handleGoBack} style={styles.goBackButton}>
          <Text style={styles.goBackButtonText}>Go back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    marginTop: 10,
    marginLeft: 10,
  },
  declinedContainer: {
    backgroundColor: 'red',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },

  declinedTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  declinedSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  cardInfo: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  moreInfoButton: {
    alignItems: 'flex-end',
    marginRight: 20,
    marginTop: 10,
  },
  moreInfoText: {
    fontSize: 16,
    color: '#0056b3',
  },
  priceDetailsContainer: {
    backgroundColor: '#F4F4F4',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },
  goBackButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  goBackButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: '#f9f9f9',
  },
});

export default BookingDeclinedPage;
