import {Modal, Pressable, TouchableOpacity, View} from 'react-native';
import {styles} from '../styles/styles';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CalendarComponent from '../../../calendar/CalendarComponent';
import React from 'react';

const CalendarModal = ({
  showDatePopUp,
  setShowDatePopUp,
  property,
  setFirstSelectedDate,
  firstSelectedDate,
  setLastSelectedDate,
  lastSelectedDate,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showDatePopUp}
      onRequestClose={() => setShowDatePopUp(false)}>
      <Pressable
        onPress={() => setShowDatePopUp(false)}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDatePopUp(false)}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <CalendarComponent
            firstDateSelected={firstSelectedDate}
            onFirstDateSelected={date => setFirstSelectedDate(date)}
            lastDateSelected={lastSelectedDate}
            onLastDateSelected={date => setLastSelectedDate(date)}
            property={property}
            clickEnabled={true}
          />
        </View>
      </Pressable>
    </Modal>
  );
};

export default CalendarModal;
