import {Text, View} from 'react-native';
import {styles} from '../styles/styles';
import {useState} from 'react';

const LocationView = ({property}) => {
  const [titleHeight, setTitleHeight] = useState(0);
  const isTwoLines = titleHeight > 30;

  return (
    <View style={[styles.contentContainer, {maxHeight: isTwoLines ? 90 : 70}]}>
      <View style={styles.content}>
        <View>
          <Text style={styles.label} numberOfLines={1}>
            {property.location.city}, {property.location.country}
          </Text>
          <Text
            style={[styles.textContent, {fontSize: 13, fontWeight: '500'}]}
            numberOfLines={2}
            onLayout={event => {
              const {height} = event.nativeEvent.layout;
              setTitleHeight(height);
            }}>
            {property.property.title}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default LocationView;
