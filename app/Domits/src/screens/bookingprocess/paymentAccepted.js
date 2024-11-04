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

const BookingConfirmationPage = ({navigation, route}) => {
  const parsedAccommodation = route.params.parsedAccommodation;
  const calculateCost = route.params.calculateCost;
  const adults = route.params.adults;
  const kids = route.params.kids;
  const pets = route.params.pets;

  const handleButton = () => {
    navigation.navigate('bookedAccommodation', {
      parsedAccommodation: parsedAccommodation,
      calculateCost: calculateCost,
      adults: adults,
      kids: kids,
      pets: pets,
    });
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back-outline" size={30} />
        </TouchableOpacity>

        <View style={styles.confirmationContainer}>
          <Icon
            name="checkmark-circle-outline"
            size={40}
            color="white"
            style={styles.confirmationIcon}
          />
          <Text style={styles.confirmationTitle}>Payment confirmed!</Text>
          <Text style={styles.confirmationSubtitle}>
            You paid with Mastercard
          </Text>
          <Text style={styles.cardInfo}>[ L. Summer ]</Text>
          <Text style={styles.cardInfo}>[0123 xxxx xxxx 2345]</Text>
        </View>

        <View style={styles.priceDetailsContainer}>
          <Text style={styles.priceDetailsTitle}>Price details</Text>
          <Text style={styles.priceDetailsText}>
            {adults} adults - {kids} kids - {pets} - pets | 3 nights
          </Text>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>
              €{parsedAccommodation.Rent} night x 3
            </Text>
            <Text style={styles.priceValue}>
              €{(parsedAccommodation.Rent * 3).toFixed(2)}
            </Text>
          </View>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>Cleaning fee</Text>
            <Text style={styles.priceValue}>
              €{parsedAccommodation.CleaningFee.toFixed(2)}
            </Text>
          </View>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>Cat tax</Text>
            <Text style={styles.priceValue}>€0.00</Text>
          </View>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>Domits service fee</Text>
            <Text style={styles.priceValue}>
              €{parsedAccommodation.ServiceFee.toFixed(2)}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total (DOL)</Text>
            <Text style={styles.totalAmount}>€{calculateCost}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreInfoButton}>
          <Text style={styles.moreInfoText}>More information</Text>
        </TouchableOpacity>

        <View style={styles.propertyDetailsContainer}>
          <Text style={styles.propertyTitle}>{parsedAccommodation.Title}</Text>
          <Text style={styles.propertyDescription}>
            {parsedAccommodation.Description}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewBookingButton}
          onPress={() => {
            handleButton();
          }}>
          <Text style={styles.viewBookingButtonText}>View booking</Text>
        </TouchableOpacity>

        <View style={styles.navbar}>
          {/* Place navigation bar icons here */}
        </View>
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
  confirmationIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confirmationSubtitle: {
    marginTop: 10,
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
