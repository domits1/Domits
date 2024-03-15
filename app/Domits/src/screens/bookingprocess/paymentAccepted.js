import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const BookingConfirmationPage = ({navigation}) => {
  const handleButton = () => {
    navigation.navigate('bookedAccommodation');
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Icon name="chevron-back-outline" size={30} />
      </TouchableOpacity>

      <View style={styles.confirmationContainer}>
        <Icon
          name="checkmark-circle"
          size={22}
          color="green"
          style={styles.confirmationIcon}
        />
        <Text style={styles.confirmationTitle}>Booking confirmed!</Text>
        <Text style={styles.confirmationSubtitle}>
          You paid with Mastercard
        </Text>
        <Text style={styles.cardInfo}>[ L. Summer ] [0123 xxxx xxxx 2345]</Text>
      </View>

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
        <Text style={styles.propertyTitle}>Kinderhuissingel 6k</Text>
        <Text style={styles.propertyDescription}>
          Fantastic villa with private swimming pool and surrounded by beautiful
          parks.
        </Text>
      </View>

      <TouchableOpacity style={styles.viewBookingButton} onPress={() => {handleButton()}}>
        <Text style={styles.viewBookingButtonText}>View booking</Text>
      </TouchableOpacity>

      <View style={styles.navbar}>{/* Place navigation bar icons here */}</View>
    </ScrollView>
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
  confirmationContainer: {
    backgroundColor: 'green',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  cardInfo: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  priceDetailsContainer: {
    backgroundColor: '#F4F4F4',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  priceDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  priceDetailsText: {
    fontSize: 16,
    marginBottom: 10,
  },
  priceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceItem: {
    fontSize: 16,
    color: '#000',
  },
  priceValue: {
    fontSize: 16,
    color: '#000',
  },
  separator: {
    borderTopColor: '#E2E2E2',
    borderTopWidth: 1,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
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
  propertyDetailsContainer: {
    backgroundColor: '#F4F4F4',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  propertyDescription: {
    fontSize: 16,
    color: '#666',
  },
  viewBookingButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  viewBookingButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default BookingConfirmationPage;
