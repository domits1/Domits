import {styles} from '../styles/styles';
import {Text, View} from 'react-native';
import ChangeButton from '../components/ChangeButton';
import TranslatedText from '../../../translation/components/TranslatedText';

const BookingDatesView = ({arrivalDate, departureDate, onChangePress}) => {
  return (
    <View style={[styles.contentContainer, {maxHeight: 68}]}>
      <View style={styles.content}>
        <View>
          <Text style={styles.label}>
            <TranslatedText textToTranslate={'Dates'} />
          </Text>
          <Text style={styles.textContent}>
            {arrivalDate} - {departureDate}
          </Text>
        </View>
        <ChangeButton onChangePress={() => onChangePress()} />
      </View>
    </View>
  );
};

export default BookingDatesView;
