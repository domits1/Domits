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

const Reviews = () => {
  // Dummy data for the example
  const review = {
    place: 'Kinderhuisssingel 6k',
    date: 'Your stay: 27/11/23 - 03/12/23',
    details:
      'Huub, the host, is a good host. He is kind and also offers free fruit. The mornings in the office are a bit chilly though.',
    views: '153 views',
    rating: 4,
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Reviews</Text>
          <Text style={styles.subHeader}>
            View, edit and/or delete your reviews.
          </Text>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.placeText}>{review.place}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={22} color="#FFD700" />
            <Text style={styles.ratingText}>{review.rating}</Text>
          </View>
          <Text style={styles.dateText}>{review.date}</Text>
          <Text style={styles.reviewText}>{review.details}</Text>
          <Text style={styles.viewsText}>{review.views}</Text>
          <View style={styles.actionRow}>
            {/*<TouchableOpacity style={styles.actionButton}>*/}
            {/*  <Text style={styles.actionText}>Change</Text>*/}
            {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
            {/*</TouchableOpacity>*/}
            {/*<TouchableOpacity style={styles.actionButton}>*/}
            {/*  <Text style={styles.actionText}>Delete</Text>*/}
            {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
            {/*</TouchableOpacity>*/}
          </View>
        </View>

        <Text style={styles.infoText}>
          You can only review an accommodation when you booked and stayed.
          Within 24 hours after your stay you will receive a review code which
          can be redeemed only once.
        </Text>
        <Text style={styles.disclaimerText}>
          This way we are sure that the reviews are 100% real and written by
          actual guests.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 16,
    color: 'gray',
  },
  reviewCard: {
    padding: 20,
  },
  placeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 18,
  },
  dateText: {
    fontSize: 16,
    color: 'gray',
    marginVertical: 5,
  },
  reviewText: {
    fontSize: 16,
  },
  viewsText: {
    fontSize: 16,
    color: 'gray',
    marginVertical: 5,
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
  actionText: {
    marginRight: 5,
    fontSize: 16,
  },
  infoText: {
    padding: 20,
    fontSize: 16,
  },
  disclaimerText: {
    padding: 20,
    paddingTop: 0,
    fontSize: 16,
    color: 'gray',
  },
});

export default Reviews;
