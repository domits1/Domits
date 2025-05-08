import {Text, View} from 'react-native';
import {styles} from '../styles/styles';

const LocationView = ({property}) => {
  return (
    <View style={[styles.contentContainer, {maxHeight: 80}]}>
      <View style={styles.content}>
        <View>
          <Text style={styles.label} numberOfLines={1}>
            {property.location.city}, {property.location.country}
          </Text>
          <Text style={styles.textContent} numberOfLines={2}>
            {property.property.title}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default LocationView;
