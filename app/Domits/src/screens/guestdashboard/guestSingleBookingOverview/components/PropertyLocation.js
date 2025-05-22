import { View, Text } from 'react-native';
import { styles } from '../styles/singleBooking';

const PropertyLocation = ({ location }) => (
    <View>
        <Text style={styles.locationTitle}>
            {location.city}, {location.country}
        </Text>
        {location.street && (
            <Text style={styles.locationSubTitle}>
                {location.street} {location.houseNumber}
            </Text>
        )}
    </View>
);

export default PropertyLocation;
