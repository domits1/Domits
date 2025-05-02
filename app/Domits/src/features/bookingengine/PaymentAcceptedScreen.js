import React from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {styles} from './styles/PaymentStyles';
import {GUEST_NEW_CONFIRMED_BOOKING_SCREEN} from "../../navigation/utils/NavigationNameConstants";

const PaymentAcceptedScreen = ({navigation, route}) => {
  const parsedAccommodation = route.params.parsedAccommodation;
  const calculateCost = route.params.calculateCost;
  const adults = route.params.adults;
  const kids = route.params.kids;
  const pets = route.params.pets;
  const nights = route.params.nights;

  const handleButton = () => {
    navigation.navigate(GUEST_NEW_CONFIRMED_BOOKING_SCREEN, {
      parsedAccommodation: parsedAccommodation,
      calculateCost: calculateCost,
      adults: adults,
      kids: kids,
      pets: pets,
      nights: nights,
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
            {adults} adults - {kids} kids - {pets} - pets | {nights} nights
          </Text>
          <View style={styles.priceItemRow}>
            <Text style={styles.priceItem}>
              €{parsedAccommodation.Rent} night x {nights}
            </Text>
            <Text style={styles.priceValue}>
              €{(parsedAccommodation.Rent * nights).toFixed(2)}
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

      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentAcceptedScreen;
