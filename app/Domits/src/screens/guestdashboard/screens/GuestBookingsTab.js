import React from 'react';
import {Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../../context/AuthContext';
import {styles} from '../styles/GuestBookingsStyles';

const GuestBookingsTab = ({navigation, route}) => {
  const parsedAccommodation = route.params.parsedAccommodation;
  const calculateCost = route.params.calculateCost;
  const adults = route.params.adults;
  const kids = route.params.kids;
  const pets = route.params.pets;
  const nights = route.params.nights;
  const {userAttributes} = useAuth();
  const firstName = userAttributes?.given_name || 'N/A';
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Icon
            name="chevron-back-outline"
            size={30}
            color="black"
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerRightIcons}>
            <Icon
              name="notifications-outline"
              size={30}
              color="black"
              style={styles.rightIcon}
              onPress={() => {}}
            />
            <Icon
              name="settings-outline"
              size={30}
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current bookings</Text>

          <View style={styles.bookingInfoCard}>
            <Image
              source={{uri: 'https://picsum.photos/200/300'}}
              style={styles.bookingImage}
            />
            <View style={styles.bookingDetails}>
              <Text style={styles.locationText}>Haarlem</Text>
              <Text style={styles.dateText}>
                From 24/02/2024 Until 30/02/2024
              </Text>
              <Text style={styles.guestsText}>
                {adults} adults - {kids} kids - {pets} pets
              </Text>
              <Text style={styles.totalText}>Total: €{calculateCost}</Text>
              <Text style={styles.propertyDescription}>
                Minimalistic and cozy apartment
              </Text>
              <TouchableOpacity style={styles.emailButton}>
                <Text style={styles.emailButtonText}>
                  Send booking overview to my email
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.previousBookingsButton}>
            <Text style={styles.previousBookingsText}>Previous bookings</Text>
            <Icon name="chevron-forward-outline" size={20} color="black" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.savedBookingsButton}>
            <Text style={styles.savedBookingsText}>Saved bookings</Text>
            <Icon name="chevron-forward-outline" size={20} color="black" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal details</Text>
          <Text style={styles.personalInfo}>{firstName}</Text>
          <Text style={styles.personalInfo}>+31 6 09877890</Text>
          <Text style={styles.personalInfoEmail}>Lotte_summer@gmail.com</Text>
          <Text style={styles.personalInfoAddress}>
            Kinderhuissingel 6K, Haarlem
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remove your data</Text>
          <TouchableOpacity style={styles.removeDataButton}>
            <Text style={styles.removeDataText}>Remove your reviews</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeDataButton}>
            <Text style={styles.removeDataText}>
              Remove your search history
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeDataButton}>
            <Text style={styles.removeDataText}>Request account deletion</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimerText}>
            Please back up anything you need before removing your data or
            deleting your account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GuestBookingsTab;
