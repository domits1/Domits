import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const formatData = (items) => {
    return items.map((item) => ({
      image: item.Images.image1,
      title: item.Title,
      city: item.City,
      country: item.Country,
      details: item.Description,
      size: `${item.Measurements}m²`,
      price: `€${item.Rent} per night`,
      id: item.ID,
      bathrooms: `${item.Bathrooms} Bathrooms`,
      bedrooms: `${item.Bedrooms} Bedrooms`,
      persons: `${item.GuestAmount} Persons`,
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const responseData = await response.json();
        const data = JSON.parse(responseData.body);
        setAccolist(formatData(data));
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (searchResults && searchResults.length > 0) {
      setAccolist(formatData(searchResults));
    } else {
      fetchData();
    }
  }, [searchResults]);

  if (loading) {
    return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
    );
  }

  const handlePress = (accommodation) => {
    navigation.navigate('Detailpage', { accommodation });
  };

  return (
      <ScrollView contentContainerStyle={styles.container}>
        {accolist.map((accommodation) => (
            <TouchableOpacity
                style={styles.card}
                key={accommodation.id}
                onPress={() => handlePress(accommodation)}
            >
              <Image source={{ uri: accommodation.image }} style={styles.image} />
              <View style={styles.cardContent}>
                <Text style={styles.title}>{accommodation.city}, {accommodation.country}</Text>
                <Text style={styles.price}>{accommodation.price}</Text>
                <Text style={styles.details}>{accommodation.details}</Text>
                <View style={styles.specs}>
                  <Text style={styles.spec}>{accommodation.size}</Text>
                  <Text style={styles.spec}>{accommodation.bathrooms}</Text>
                  <Text style={styles.spec}>{accommodation.bedrooms}</Text>
                  <Text style={styles.spec}>{accommodation.persons}</Text>
                </View>
              </View>
            </TouchableOpacity>
        ))}
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 16,
    color: '#00f',
  },
  details: {
    fontSize: 14,
    marginTop: 5,
  },
  specs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  spec: {
    fontSize: 12,
    color: '#555',
  },
});

export default Accommodations;
