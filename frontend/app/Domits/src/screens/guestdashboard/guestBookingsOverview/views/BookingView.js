import React from 'react';
import {Image, View, Text, TouchableOpacity} from 'react-native';
import {S3URL} from '../../../../store/constants';
import {styles} from '../styles/BookingView';
import Spacer from '../../../../components/Spacer';
import TranslatedText from "../../../../features/translation/components/TranslatedText";

const BookingView = ({property, booking, onPress}) => {
  if (!property) {
    return (
      <View style={styles.container}>
        <TranslatedText textToTranslate={"Property information unavailable."} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => onPress()}>
        <Image
          source={{uri: `${S3URL}${property.propertyImages[0].key}`}}
          style={styles.image}
          resizeMode="cover"
        />
        <Spacer padding={4} />
        <View style={styles.row}>
          <Text style={styles.propertyLocation} numberOfLines={2}>
            {property.propertyLocation.city || ''},{' '}
            {property.propertyLocation.country || ''}
          </Text>
          <Text style={styles.bookingStatus} numberOfLines={2}>
            Status:{' '}
            <Text
              style={{color: booking.status.S === 'Paid' ? 'green' : 'red'}}>
              {booking.status.S}
            </Text>
          </Text>
        </View>
        <Spacer padding={4} />
        <View style={styles.row}>
          <Text style={styles.dates}>
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
      </TouchableOpacity>
    </View>
  );
};

export default BookingView;
