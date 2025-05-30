import {styles} from '../styles/styles';
import {Text, View} from 'react-native';
import Spacer from '../../../../components/Spacer';

const LocationView = ({location, description}) => {
  return (
    <View style={[styles.contentContainer, {maxHeight: 200}]}>
        <View style={styles.locationContent}>
          <Text style={styles.locationLabel}>
            {location.street} {location.houseNumber}{' '}
            {location.houseNumberExtension}
          </Text>
          <Spacer padding={5} />
          <Text style={styles.locationTextContent} numberOfLines={6}>{description}</Text>
        </View>
    </View>
  );
};

export default LocationView;
