import React from 'react'
import {View, Text, StyleSheet, Button, ScrollView, Alert} from 'react-native'
import {useAuth} from '../../context/AuthContext'

function ReviewAndSubmitScreen({route, navigation}) {
  const {listingData} = route.params
  const {user} = useAuth()

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('User not authenticated')
      return
    }

    try {
      const listingWithUserId = {...listingData, OwnerId: user}
      await saveListingToAPI(listingWithUserId)
      Alert.alert('Listing created successfully!')
      navigation.popToTop() // Go back to the initial screen
    } catch (error) {
      console.error(error)
      Alert.alert('Failed to create listing.')
    }
  }

  const saveListingToAPI = async listing => {
    const response = await fetch(
      'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/createAccomodation',
      {
        method: 'POST',
        body: JSON.stringify(listing),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error('Error saving listing to API')
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Review Your Listing</Text>
      <Text style={styles.label}>Title: {listingData.Title}</Text>
      <Text style={styles.label}>Subtitle: {listingData.Subtitle}</Text>
      <Text style={styles.label}>Description: {listingData.Description}</Text>
      <Text style={styles.label}>
        Accommodation Type: {listingData.AccommodationType}
      </Text>
      <Text style={styles.label}>Price per Night: ${listingData.Rent}</Text>
      <Text style={styles.label}>Guests: {listingData.GuestAmount}</Text>
      <Text style={styles.label}>Bedrooms: {listingData.Bedrooms}</Text>
      <Text style={styles.label}>Bathrooms: {listingData.Bathrooms}</Text>
      <Text style={styles.label}>Beds: {listingData.Beds}</Text>
      <Text style={styles.label}>Street: {listingData.Street}</Text>
      <Text style={styles.label}>City: {listingData.City}</Text>
      <Text style={styles.label}>Country: {listingData.Country}</Text>
      <Text style={styles.label}>Postal Code: {listingData.PostalCode}</Text>
      <Text style={styles.label}>Start Date: {listingData.StartDate}</Text>
      <Text style={styles.label}>End Date: {listingData.EndDate}</Text>
      <Text style={styles.label}>
        Cancellation Policy: {listingData.CancelPolicy}
      </Text>
      <Text style={styles.label}>Guest Type: {listingData.GuestType}</Text>
      <Text style={styles.label}>
        Features:{' '}
        {Object.keys(listingData.Features)
          .map(key => `${key}: ${listingData.Features[key] ? 'Yes' : 'No'}`)
          .join(', ')}
      </Text>
      <Button title="Submit Listing" onPress={handleSubmit} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFF',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
})

export default ReviewAndSubmitScreen
