import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Header
  backButton: {
    marginTop: 10,
    marginLeft: 10,
  },
  // Divider
  separator: {
    borderTopColor: '#E2E2E2',
    borderTopWidth: 1,
    marginVertical: 10,
  },
  // Payment declined
  declinedContainer: {
    backgroundColor: 'red',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },
  declinedTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  declinedSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  // Payment accepted
  confirmationContainer: {
    backgroundColor: 'green',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },
  confirmationIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confirmationSubtitle: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Payment card details
  cardInfo: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  // Price details
  priceDetailsContainer: {
    backgroundColor: '#F4F4F4',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  priceDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  priceDetailsText: {
    fontSize: 16,
    marginBottom: 10,
  },
  priceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceItem: {
    fontSize: 16,
    color: '#000',
  },
  priceValue: {
    fontSize: 16,
    color: '#000',
  },
  // Total price
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  // More details button
  moreInfoButton: {
    alignItems: 'flex-end',
    marginRight: 20,
    marginTop: 10,
  },
  moreInfoText: {
    fontSize: 16,
    color: '#0056b3',
  },
  // Go back button
  goBackButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  goBackButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Property details
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  propertyDetailsContainer: {
    backgroundColor: '#F4F4F4',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },
  propertyDescription: {
    fontSize: 16,
    color: '#666',
  },
  // View bookings button
  viewBookingButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  viewBookingButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});
