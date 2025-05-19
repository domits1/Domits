import {Text, View} from 'react-native';
import {styles} from '../styles/singleBooking';
import Spacer from '../../../../components/Spacer';
import PropertyImage from "../components/PropertyImage";
import PropertyLocation from "../components/PropertyLocation";
import PropertyAmenities from "../components/PropertyAmenities";
import BookingDetailsView from "./BookingView";

const PropertyView = ({property, booking}) => {
  return (
    <View style={styles.propertyContainer}>
      <PropertyImage imageKey={property.images[0].key} />
      <View style={styles.infoContainer}>
        <PropertyLocation location={property.location} />
        <Spacer />
        <Text style={styles.bookingSubTitle} numberOfLines={5}>
          {property.property.description}
        </Text>
        <Spacer />
        <PropertyAmenities amenities={property.amenities} />
        <Spacer />
        <BookingDetailsView booking={booking} />
      </View>
    </View>
  );
};

export default PropertyView;
