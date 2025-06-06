import {Modal, Text, ToastAndroid, TouchableOpacity, View} from 'react-native';
import {styles} from '../styles/styles';
import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ToastMessage from '../../../../components/ToastMessage';

const GuestsModal = ({onClose, maxGuests, guests, setGuests}) => {
  /**
   * Verifies the new amount of guests
   * follows the required business rules.
   * Then sets the new amount of guests.
   */
  const setAmountOfGuests = amount => {
    if (guests + amount > maxGuests) {
      ToastMessage(`Maximum amount of allowed guests is ${maxGuests}`, ToastAndroid.SHORT);
    } else if (guests + amount < 1) {
      ToastMessage(`Minimum amount of guests required is 1`, ToastAndroid.SHORT);
    } else {
      setGuests(guests + amount);
    }
  };

  return (
    <Modal transparent={true} visible={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.guestAmountModalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Guests</Text>
          <Text style={styles.modalSubTitle}>
            Maximum amount of guest(s) is {maxGuests}
          </Text>

          {/* Guests */}
          <View style={styles.guestRow}>
            <Text style={styles.guestType}>Guests</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity onPress={() => setAmountOfGuests(-1)}>
                <Text style={styles.counterButton}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterText}>{guests}</Text>
              <TouchableOpacity onPress={() => setAmountOfGuests(1)}>
                <Text style={styles.counterButton}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            onPress={() => onClose()}
            style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default GuestsModal;
