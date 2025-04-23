import React from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {styles} from '../styles/PaymentStyles';
import NavigateTo from "../../../navigation/NavigationFunctions";

const PaymentDeclinedScreen = ({navigation, route}) => {
  const parsedAccommodation = route.params.parsedAccommodation;
  const handleGoBack = () => {
    NavigateTo(navigation).home();
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
          <Text style={styles.cardInfo}>Mastercard</Text>
          <Text style={styles.cardInfo}>[ L.Summer ]</Text>
          <Text style={styles.cardInfo}>[0123 xxxx xxxx 2345]</Text>
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
          <Text style={styles.propertyTitle}>{parsedAccommodation.Title}</Text>
          <Text style={styles.propertyDescription}>
            {parsedAccommodation.Description}
          </Text>
        </View>

        <TouchableOpacity onPress={handleGoBack} style={styles.goBackButton}>
          <Text style={styles.goBackButtonText}>Go back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentDeclinedScreen;
