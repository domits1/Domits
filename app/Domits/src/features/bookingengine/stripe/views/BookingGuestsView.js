import {styles} from '../styles/styles';
import {Text, View} from 'react-native';
import ChangeButton from '../components/ChangeButton';

const BookingGuestsView = ({adults, kids, onChangePress}) => {
  return (
    <View style={[styles.contentContainer, {maxHeight: 68}]}>
      <View style={styles.content}>
        <View>
          <Text style={styles.label}>Guests</Text>
          <Text style={styles.textContent}>
            {adults} adults - {kids} kids
          </Text>
        </View>
        <ChangeButton onChangePress={() => onChangePress()} />
      </View>
    </View>
  );
};

export default BookingGuestsView;
