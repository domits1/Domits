import {styles} from '../styles/styles';
import {Text, View} from 'react-native';
import Spacer from '../../../../components/Spacer';

const CancelledView = ({onPress}) => {
  return (
    <View style={[styles.cancelledContainer, {maxHeight: 105}]}>
      <View style={styles.cancelledContent}>
        <Text style={styles.cancelledLabel}>Payment cancelled.</Text>
        <Spacer padding={5} />
        <Text style={styles.cancelledTextContent}>
          Something went wrong during payment.
        </Text>
        <Text style={styles.cancelledTextContent}>
          If you wish to cancel your booking, press{' '}
          <Text
            style={{
                color: '#AFCBFF',
              fontWeight: '900',
              textDecorationLine: 'underline',
            }}
            onPress={() => onPress()}>
            Here
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default CancelledView;
