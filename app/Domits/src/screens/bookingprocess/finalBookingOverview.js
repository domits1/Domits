import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';

const PaymentPage = ({navigation}) => {
  const handleButton = () => {
    navigation.navigate('simulateStripe');
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <Icon
          name="chevron-back-outline"
          size={30}
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.paymentStatus}>Payment in process</Text>
        <Text style={styles.paymentInstruction}>
          Choose your payment method.
        </Text>

        <View style={styles.priceDetailSection}>
          <Text style={styles.priceDetailTitle}>Price details</Text>
          <Text style={styles.priceDetailText}>
            2 adults - 2 kids | 3 nights
          </Text>
          <View style={styles.priceItem}>
            <Text style={styles.priceItemLabel}>$140 night x 3</Text>
            <Text style={styles.priceItemValue}>$420.00</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceItemLabel}>Cleaning fee</Text>
            <Text style={styles.priceItemValue}>$50.00</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceItemLabel}>Cat tax</Text>
            <Text style={styles.priceItemValue}>$17.50</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceItemLabel}>Domits service fee</Text>
            <Text style={styles.priceItemValue}>$39.50</Text>
          </View>
          <View style={styles.totalLine} />
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total (DOL)</Text>
            <Text style={styles.totalValue}>$527.00</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreInfoButton}>
          <Text style={styles.moreInfoText}>More information</Text>
        </TouchableOpacity>

        <View style={styles.paymentMethodSection}>
          <Text style={styles.paymentMethodText}>Mastercard</Text>
          <TouchableOpacity style={styles.changeButton}>
            <Text style={styles.changeText}>Change</Text>
            <Icon
              name="chevron-forward-outline"
              size={20}
              style={styles.changeIcon}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleButton} style={styles.proceedButton}>
          <Text style={styles.proceedButtonText}>Proceed to pay</Text>
        </TouchableOpacity>
        <Text style={styles.stripeText}>
          Secure payment gateway powered by Stripe.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
  },
  backIcon: {
    marginTop: 10,
    marginLeft: 10,
  },
  paymentStatus: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
  },
  paymentInstruction: {
    fontSize: 16,
    color: '#6D6D6D',
    marginBottom: 20,
  },
  priceDetailSection: {
    backgroundColor: '#F4F4F4',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  priceDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  priceDetailText: {
    fontSize: 16,
    marginBottom: 10,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceItemLabel: {
    fontSize: 16,
  },
  priceItemValue: {
    fontSize: 16,
  },
  totalLine: {
    borderTopColor: '#E2E2E2',
    borderTopWidth: 2,
    marginBottom: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moreInfoButton: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  moreInfoText: {
    color: '#0056b3',
    fontSize: 16,
  },
  paymentMethodSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 16,
    color: '#0056b3',
    marginRight: 5,
  },
  changeIcon: {
    color: '#0056b3',
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  proceedButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stripeText: {
    fontSize: 14,
    color: '#6D6D6D',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default PaymentPage;
