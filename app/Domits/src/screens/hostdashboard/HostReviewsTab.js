import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import DateFormatterDD_MM_YYYY from '../utils/DateFormatterDD_MM_YYYY';

function HostReviews() {
  const {userAttributes, isAuthenticated, checkAuth} = useAuth();
  const [reviews, setReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoading2, setIsLoading2] = useState(true);
  const userId = userAttributes?.sub;

  const fetchReviews = async () => {
    setIsLoading(true);
    if (!userId) {
      console.log('No user ID available');
      setIsLoading(false);
      return;
    }

    const options = {userIdFrom: userId};
    try {
      const response = await fetch(
        'https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReviews',
        {
          method: 'POST',
          body: JSON.stringify(options),
          headers: {'Content-Type': 'application/json'},
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReceivedReviews = async () => {
    setIsLoading2(true);
    if (!userId) {
      console.log('No user ID available');
      setIsLoading2(false);
      return;
    }

    const options = {itemIdTo: userId};
    try {
      const response = await fetch(
        'https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReceivedReviews',
        {
          method: 'POST',
          body: JSON.stringify(options),
          headers: {'Content-Type': 'application/json'},
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setReceivedReviews(data);
    } catch (error) {
      console.error('Error fetching received reviews:', error);
    } finally {
      setIsLoading2(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchReviews();
      fetchReceivedReviews();
    } else if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, userId]);

  const asyncDeleteReview = async review => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'OK',
          onPress: async () => {
            const reviewId = review['reviewId '];
            const options = {'reviewId ': reviewId};
            try {
              const response = await fetch(
                'https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/DeleteReview',
                {
                  method: 'DELETE',
                  body: JSON.stringify(options),
                  headers: {'Content-Type': 'application/json'},
                },
              );

              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }

              const updatedReviews = reviews.filter(
                r => r['reviewId '] !== reviewId,
              );
              setReviews(updatedReviews);
            } catch (error) {
              console.error('Error deleting review:', error);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#ffffff'}}>
      <ScrollView contentContainerStyle={styles.pageBody}>
        <Text style={styles.heading}>Reviews</Text>
        <View style={styles.reviewGrid}>
          <View style={styles.reviewColumn}>
            <View style={styles.reviewBox}>
              <Text style={styles.boxText}>My Reviews ({reviews.length})</Text>
              {isLoading ? (
                <ActivityIndicator size="large" color="#0D9813" />
              ) : reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <View key={index} style={styles.reviewTab}>
                    <Text style={styles.reviewHeader}>{review.title}</Text>
                    <Text style={styles.reviewContent}>{review.content}</Text>
                    <Text style={styles.reviewDate}>
                      Written on: {DateFormatterDD_MM_YYYY(review.date)}
                    </Text>
                    <TouchableOpacity onPress={() => asyncDeleteReview(review)}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.alertText}>
                  You have not written any reviews yet...
                </Text>
              )}
            </View>
          </View>
          <View style={styles.reviewColumn}>
            <View style={styles.reviewBox}>
              <Text style={styles.boxText}>
                Received Reviews ({receivedReviews.length})
              </Text>
              {isLoading2 ? (
                <ActivityIndicator size="large" color="#0D9813" />
              ) : receivedReviews.length > 0 ? (
                receivedReviews.map((review, index) => (
                  <View key={index} style={styles.reviewTab}>
                    <Text style={styles.reviewHeader}>{review.title}</Text>
                    <Text style={styles.reviewContent}>{review.content}</Text>
                    <Text style={styles.reviewDate}>
                      Written on: {DateFormatterDD_MM_YYYY(review.date)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.alertText}>
                  You have not received any reviews yet...
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageBody: {
    padding: 10,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    color: '#777',
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reviewColumn: {
    flex: 1,
    margin: 10,
    minWidth: 155,
  },
  reviewBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewTab: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginVertical: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#777',
  },
  reviewContent: {
    marginVertical: 5,
    color: '#777',
  },
  reviewDate: {
    color: '#0D9813',
  },
  deleteIcon: {
    width: 20,
    height: 20,
    marginTop: 5,
  },
  boxText: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginVertical: 5,
    color: '#777',
  },
  alertText: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#777',
  },
});

export default HostReviews;
