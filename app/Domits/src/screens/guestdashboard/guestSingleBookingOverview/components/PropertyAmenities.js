import {Text, TouchableOpacity, View} from 'react-native';
import {styles} from '../styles/singleBooking';
import AmenitiesPopup from '../../../propertyDetailsScreen/components/amenitiesPopup';
import {useState} from "react";

const PropertyAmenities = ({amenities}) => {
    const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setShowAmenitiesModal(true)}>
        <View style={styles.showAmenitiesContainer}>
          <Text style={styles.showAmenitiesText}>Show amenities</Text>
        </View>
      </TouchableOpacity>
      {showAmenitiesModal && (
        <AmenitiesPopup
          propertyAmenities={amenities}
          onClose={() => setShowAmenitiesModal(false)}
        />
      )}
    </View>
  );
};

export default PropertyAmenities;