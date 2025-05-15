import {styles} from '../styles/styles';
import {Text, View} from 'react-native';
import ChangeButton from '../components/ChangeButton';
import TranslatedText from '../../../translation/components/TranslatedText';

const BookingGuestsView = ({guests, onChangePress}) => {
  return (
    <View style={[styles.contentContainer, {maxHeight: 68}]}>
      <View style={styles.content}>
        <View>
          <Text style={styles.label}>
            <TranslatedText textToTranslate={'Guests'} />
          </Text>
          <Text style={styles.textContent}>
            {guests} <TranslatedText textToTranslate={'Guests'} />
          </Text>
        </View>
        <ChangeButton onChangePress={() => onChangePress()} />
      </View>
    </View>
  );
};

export default BookingGuestsView;
