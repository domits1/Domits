import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerRightIcons: {
    flexDirection: 'row',
  },
  rightIcon: {
    marginLeft: 20,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    paddingLeft: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  bookingInfoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 20,
    marginRight: 20,
  },
  bookingImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  locationText: {
    fontWeight: '600',
    fontSize: 18,
    marginTop: 10,
    marginLeft: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
    marginTop: 5,
  },
  guestsText: {
    fontSize: 16,
    marginLeft: 10,
    marginTop: 5,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    marginTop: 5,
  },
  propertyDescription: {
    fontSize: 16,
    marginLeft: 10,
    marginTop: 5,
    marginBottom: 10,
  },
  emailButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  emailButtonText: {
    fontSize: 16,
    color: '#0056b3',
  },
  previousBookingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F6D7A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  previousBookingsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 5,
  },
  savedBookingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61C46D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  savedBookingsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 5,
  },

  personalInfo: {
    fontSize: 16,
    marginLeft: 20,
    marginTop: 10,
  },
  personalInfoEmail: {
    // Similar to personalInfo
  },
  personalInfoAddress: {
    // Similar to personalInfo
  },
  removeDataButton: {
    // Styles for remove data buttons
  },
  removeDataText: {
    fontSize: 16,
    color: '#FF0000',
    marginLeft: 20,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  bookingDetails: {

  }
});

export default GuestBookingsTab;
