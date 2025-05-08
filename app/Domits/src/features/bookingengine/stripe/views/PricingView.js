import {Text, View} from 'react-native';
import {styles} from '../styles/styles';
import Spacer from '../../../../components/Spacer';
import LineDivider from '../../../../components/LineDivider';

const PricingView = ({adults, kids, nights, pricing}) => {
  return (
    <View style={[styles.contentContainer, {maxHeight: 250}]}>
      <View style={styles.content}>
        <View>
          <Text style={styles.label}>Price details</Text>
          <Text style={styles.textContent}>
            {adults} adults - {kids} kids | {nights} nights
          </Text>
          <Spacer />
          <View style={styles.priceContainer}>
            <Text style={styles.textContent}>${pricing.roomRate} night x {nights}</Text>
            <Text style={styles.textContent}>${pricing.roomRate * nights}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.textContent}>Cleaning fee</Text>
            <Text style={styles.textContent}>${pricing.cleaning}</Text>
          </View>
          <Spacer />
          <View style={styles.priceContainer}>
            <Text style={styles.textContent}>Domits service fee</Text>
            <Text style={styles.textContent}>${pricing.service}</Text>
          </View>
          <LineDivider width={"95%"} />
          <View style={styles.priceContainer}>
            <Text style={[styles.textContent, {fontWeight: "700"}]}>Total (excl. tax)</Text>
            <Text style={[styles.textContent, {fontWeight: "700"}]}>${(pricing.roomRate * nights) + pricing.cleaning + pricing.service}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default PricingView;
