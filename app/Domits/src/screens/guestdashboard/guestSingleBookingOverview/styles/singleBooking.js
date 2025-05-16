import {StyleSheet} from 'react-native';
import {COLORS} from '../../../../styles/COLORS';

export const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  propertyContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '95%',
    backgroundColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    borderRadius: 20,
  },
  imageContainer: {
    width: '100%',
  },
  image: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 300,
    width: '100%',
  },
  infoContainer: {
    padding: 15,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: 330,
  },
  locationTitle: {
    fontSize: 20,
    color: 'black',
    fontWeight: '500',
  },
  locationSubTitle: {
    fontSize: 16,
    color: 'black',
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showAmenitiesContainer: {
    display: 'flex',
    width: '50%',
    padding: 5,
    backgroundColor: COLORS.domitsGuestGreen,
    borderRadius: 20,
  },
  showAmenitiesText: {
    alignSelf: 'center',
    color: 'white',
    fontSize: 18,
  },
  bookingContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },
  bookingTitle: {
    fontSize: 20,
    color: 'black',
    fontWeight: '500',
  },
  bookingSubTitle: {
    fontSize: 16,
    color: 'black',
    fontWeight: '400',
  },
});
