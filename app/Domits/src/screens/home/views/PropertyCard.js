import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import { PROPERTY_DETAILS_SCREEN } from '../../../navigation/utils/NavigationNameConstants';

const PropertyCard = ({property}) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate(PROPERTY_DETAILS_SCREEN, {property})}>
      <Image
        source={{
          uri: `https://accommodation.s3.eu-north-1.amazonaws.com/${property.propertyImages[0].key}`,
        }}
        style={styles.image}
        resizeMode="cover"
      />

      <View>
        <View style={styles.title}>
          <Text style={styles.address}>{property.propertyLocation.city}</Text>
        </View>

        <View style={styles.subtitle}>
          <Text style={styles.host}>{property.property.hostId}</Text>

          <Text style={styles.price}>
            ${property.propertyPricing.roomRate}{' '}
            <Text style={styles.night}>night</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    margin: 16,
    elevation: 4,
    color: '#000000',
  },

  image: {
    width: '100%',
    height: 400,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 8,
  },

  details: {
    padding: 12,
  },

  title: {
    display: 'flex',
  },

  address: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  subtitle: {
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'space-between',
  },

  host: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  price: {
    fontSize: 18,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

  night: {
    fontWeight: 'normal',
  },
});

export default PropertyCard;
