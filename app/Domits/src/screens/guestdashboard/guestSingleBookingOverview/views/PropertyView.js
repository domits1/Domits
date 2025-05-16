import {Image, Text, TouchableOpacity, View} from 'react-native';
import {S3URL} from '../../../../store/constants';
import {styles} from '../styles/singleBooking';
import {useState} from 'react';
import AmenitiesPopup from '../../../propertyDetailsScreen/components/amenitiesPopup';
import Spacer from '../../../../components/Spacer';

const PropertyView = ({property, booking}) => {
  console.log(booking);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  return (
    <View style={styles.propertyContainer}>
      <View style={styles.imageContainer}>
        <Image
          style={styles.image}
          source={{uri: `${S3URL}${property.images[0].key}`}}
        />
      </View>
      <View style={styles.infoContainer}>
        {property.location.street && (
          <View>
            <Text style={styles.locationTitle}>
              {property.location.city}, {property.location.country}
            </Text>
            <Text style={styles.locationSubTitle}>
              {property.location.street} {property.location.houseNumber}
            </Text>
          </View>
        )}
        {!property.location.street && (
          <View>
            <Text style={styles.locationTitle}>
              {property.location.city}, {property.location.country}
            </Text>
          </View>
        )}
        <Spacer />
        <Text style={styles.bookingSubTitle} numberOfLines={5}>
          {property.property.description}
        </Text>
        <Spacer />
        <TouchableOpacity onPress={() => setShowAmenitiesModal(true)}>
          <View style={styles.showAmenitiesContainer}>
            <Text style={styles.showAmenitiesText}>Show amenities</Text>
          </View>
        </TouchableOpacity>
        {showAmenitiesModal && (
          <AmenitiesPopup
            propertyAmenities={property.amenities}
            onClose={() => setShowAmenitiesModal(false)}
          />
        )}
        <Spacer />
        <View style={styles.bookingContainer}>
          <Text style={styles.bookingTitle}>Booking</Text>
          <Text style={styles.bookingSubTitle}>Status: {booking.status.S}</Text>
          <Text style={styles.bookingSubTitle}>
            Period:{' '}
            {
              new Date(parseFloat(booking.arrivalDate.N))
                .toISOString()
                .split('T')[0]
            }{' '}
            -{' '}
            {
              new Date(parseFloat(booking.departureDate.N))
                .toISOString()
                .split('T')[0]
            }
          </Text>
        </View>
      </View>
    </View>
  );
};

export default PropertyView;
