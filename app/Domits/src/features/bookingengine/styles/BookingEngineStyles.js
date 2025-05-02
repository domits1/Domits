import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // General
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  section: {
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  linkText: {
    fontSize: 16,
    color: '#0056b3',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Property details
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  // Divider
  separator: {
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  // Price details
  priceDetails: {
    marginBottom: 20,
  },
  priceDetailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  // Book button
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stripeText: {
    fontSize: 14,
    color: '#6D6D6D',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  // Modal counter button
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    fontSize: 20,
    paddingHorizontal: 10,
    color: '#4CAF50',
  },
  counterText: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  // Modal close button
  closeButton: {
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Modal confirm button
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Guests popup
  guestAmountModalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  guestType: {
    fontSize: 16,
  },
  // Calendar popup
  calendarModalContent: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },

});
