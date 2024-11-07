import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@aws-amplify/ui-react-native/src/primitives';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import ImageSlider from "../../components/utils/ImageSlider";
import DateFormatterDD_MM_YYYY from "../../components/utils/DateFormatterDD_MM_YYYY";

const Dashboard = () => {
  const { userAttributes } = useAuth();
  const firstName = userAttributes?.['given_name'] || 'N/A';
  const email = userAttributes?.email || 'N/A';
  const navigation = useNavigation();
  const [accommodations, setAccommodations] = useState([]);
  const userId = userAttributes?.sub;

  const fetchRecentAccommodations = async () => {
    if (!userId) return;

    try {
      const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchRecentAccommodations', {
        method: 'POST',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ OwnerId: userId }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setAccommodations(JSON.parse(data.body));
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRecentAccommodations();
    }
  }, [userId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor:'#F9F9F9', }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Dashboard</Text>
        </View>

        <Text style={styles.welcome}>Welcome {firstName}</Text>

        <View style={styles.rowContainer}>
          <Button onPress={fetchRecentAccommodations} style={styles.sectionButton}>
            <Text style={styles.infoText}>Refresh</Text>
          </Button>
          <Button onPress={() => navigation.navigate('HostListings')} style={styles.sectionButton}>
            <Text style={styles.infoText}>Go to listing</Text>
          </Button>
          <Button onPress={() => navigation.navigate('OnboardingHost')} style={styles.sectionButton}>
            <Text style={styles.infoText}>Add accommodation</Text>
          </Button>
        </View>
        
        <View style={styles.personalDetails}>
          <Text style={styles.personalDetails}>Personal details</Text>
        </View>
                  <Text style={styles.personalText}><Text style={styles.bold}>Name:</Text> {firstName}</Text>
          <Text style={styles.personalText} ><Text style={styles.bold}>Email:</Text> {email}</Text>

        <Text style={styles.listingText}>Listings</Text>
        <View style={styles.accommodationContainer}>
          {accommodations.length > 0 ? (
            accommodations.map((accommodation, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dashboardCard}
                onPress={() =>
                  !accommodation.Drafted
                    ? navigation.navigate('ListingDetails', { ID: accommodation.ID })
                    : Alert.alert('Alert', 'This accommodation is drafted and cannot be viewed in listing details!')
                }
              >
                <View style={styles.accommodationText}>
                  <Text style={styles.accommodationTitle}>{accommodation.Title}</Text>
                  {/* <Text style={styles.accommodationLocation}>
                    {accommodation.AccommodationType === 'Boat'
                      ? `${accommodation.City}, ${accommodation.Harbour}`
                      : `${accommodation.City}, ${accommodation.Street}, ${accommodation.PostalCode}`}
                  </Text> */}
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ImageSlider images={accommodation.Images} seconds={5} page="dashboard" />
                </View>
                <View style={styles.accommodationDetails}>
                  <Text style={accommodation.Drafted ? styles.isDrafted : styles.isLive}>
                    Status: {accommodation.Drafted ? 'Drafted' : 'Live'}
                  </Text>
                    <Text style={styles.availableText}>Listed on: {DateFormatterDD_MM_YYYY(accommodation.createdAt)}</Text> 
                    <Text style={styles.availableText}>
                    Available from: 
                    {accommodation.DateRanges.length > 0 && accommodation.DateRanges[0].startDate 
                      ? `${DateFormatterDD_MM_YYYY(accommodation.DateRanges[0].startDate)} to ${DateFormatterDD_MM_YYYY(accommodation.DateRanges[accommodation.DateRanges.length - 1].endDate)}`
                      : 'Date range not set'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noAccommodations}> 
              <Text style={styles.availableText}>It appears that you have not listed any accommodations recently...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    left: 20,
    paddingVertical: 10,
    // borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  welcome: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: 'black',
    fontSize: 20,
    marginVertical: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginVertical: 10,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  sectionButton: { 
    paddingVertical: 10,
    paddingHorizontal: 10, 
    borderRadius: 8,
    backgroundColor: '#003366',
    marginHorizontal: 5, 
    alignItems: 'center',
  },

  personalDetails: {
    textAlign: 'center',
    fontWeight: 'bold',
    paddingVertical: 20,
    fontSize: 20,
    color: 'black',
  },
  personalText: {
    color: 'black',
    left: 30,
    fontSize: 15,
    padding: 5,
  },
  bold:{
    fontWeight: 'bold',
    fontSize: 15,
  },
  infoText: {
    color: 'white',
  },
  listingText: {
    textAlign: 'center',
    fontSize: 20,
    color: 'black',
    marginVertical: 10,
  },
  dashboardCard: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderColor: '#ddd',
  },
  accommodationText: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    position: 'absolute',
    bottom: 110,  
    left: 80,
    right: 80,
    top: 220,  
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 1,
    alignItems: 'center', 
  },

  accommodationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white', 
  },
  accommodationLocation: {
    fontSize: 16,
    color: '#ddd', 
  },
  accommodationDetails: {
    marginTop: 10,
  },
  isDrafted: {
    color: 'red',
    textAlign: 'center',
  },
  isLive: {
    color: 'green',
    textAlign: 'center',
  },
  availableText: {
    color: 'black',
    textAlign: 'center',
  },
  noAccommodations: {
    alignItems: 'center',
    paddingVertical: 20,
  },
});


export default Dashboard;
