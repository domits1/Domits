import {styles} from '../styles/styles';
import {Text, View} from 'react-native';
import Spacer from '../../../../components/Spacer';
import TranslatedText from '../../../translation/components/TranslatedText';

const CancelledView = ({onPress}) => {
  return (
    <View style={[styles.cancelledContainer, {maxHeight: 105}]}>
      <View style={styles.cancelledContent}>
        <Text style={styles.cancelledLabel}>
          <TranslatedText textToTranslate={'Payment cancelled'} />
        </Text>
        <Spacer padding={5} />
        <Text style={styles.cancelledTextContent}>
          <TranslatedText
            textToTranslate={'Something went wrong during payment'}
          />
        </Text>
        <Text style={styles.cancelledTextContent}>
          <TranslatedText
            textToTranslate={'If you wish to cancel your booking'}
          />
          {', '}
          <TranslatedText textToTranslate={'Press'} />{' '}
          <Text
            style={{
              color: '#AFCBFF',
              fontWeight: '900',
              textDecorationLine: 'underline',
            }}
            onPress={() => onPress()}>
            <TranslatedText textToTranslate={"Here"} />
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default CancelledView;
