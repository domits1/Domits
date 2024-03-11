import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const OnBoarding1 = ({ navigation }) => {
  return (
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.header}>
            <Icon
                name="chevron-back-outline"
                size={30}
                color="black"
                onPress={() => navigation.goBack()}
            />
            <Text style={styles.headerText}>Detail</Text>
          </View>
          <Image
              source={{ uri: 'https://picsum.photos/200/300' }}
              style={styles.image}
          />
          <View style={styles.detailsContainer}>
            <Text style={styles.title}>Kinderhuissingle 6k</Text>
            <Text style={styles.description}>
              Fantastic villa with private swimming pool and surrounded by beautiful parks.
            </Text>
            <View style={styles.separator} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dates</Text>
              <Text style={styles.sectionContent}>05/12/2023 - 08/12/2023</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.separator} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Travellers</Text>
              <Text style={styles.sectionContent}>2 adults - 2 kids</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.separator} />
            <View style={styles.priceDetails}>
              <Text style={styles.sectionTitle}>Price details</Text>
              <Text style={styles.sectionContent}>2 adults - 2 kids | 3 nights</Text>
              <Text style={styles.priceBreakdown}>$400 night x 3 nights - $1200</Text>
              <Text style={styles.fee}>Cleaning fee - $500.00</Text>
              <Text style={styles.tax}>Cat tax - $75.00</Text>
              <Text style={styles.serviceFee}>Domris service fee - $39.50</Text>
              <Text style={styles.total}>Total (USD) - $527.00</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book Kinderhuissingle 6k</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.navbar}>
          {/* Render your navbar items here */}
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  separator: {
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  linkText: {
    fontSize: 16,
    color: '#0056b3',
  },
  priceDetails: {
    marginBottom: 20,
  },
  priceBreakdown: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  fee: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  tax: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  serviceFee: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
});

export default OnBoarding1;
