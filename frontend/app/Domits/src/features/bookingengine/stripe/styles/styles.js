import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
  },
  image: {
    marginTop: 70,
    alignSelf: 'center',
    width: '90%',
    height: '100%',
    maxHeight: 100,
    borderRadius: 20,
  },
  contentContainer: {
    alignSelf: 'center',
    width: '90%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'white',
    // iOS shadow properties
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    // Android shadow properties
    elevation: 4,
  },
  content: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: '95%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: 'black',
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 24,
  },
  textContent: {
    color: 'black',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 24,
  },
  changeButton: {
    color: '#0A760F',
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 24
  },
  underline: {
    width: '100%',
    backgroundColor: '#0A760F',
    height: 2,
    position: 'absolute',
    bottom: 1
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
  // Modal close button
  closeButton: {
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
  // Pricing
  priceContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Confirm and pay button
  confirmAndPayButton: {
    alignSelf: 'center',
    width: '85%',
    height: 40,
    backgroundColor: '#0D9813',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
