import {Modal, Text, ToastAndroid, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/styles";
import React, {useState} from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const GuestsModal = ({onClose, maxGuests, currentAdults, currentKids, setAdults, setKids}) => {
    const [tempAdults, setTempAdults] = useState(currentAdults || 1);
    const [tempKids, setTempKids] = useState(currentKids || 0);
    const totalGuests = tempAdults + tempKids;

    /**
     * Increment the amount of guests.
     * Notifies the user if the max amount is reached.
     * @param type - Guest type to increment.
     */
    const incrementGuests = type => {
        if (totalGuests < maxGuests) {
            if (type === 'adults') {
                setTempAdults(tempAdults + 1);
            }
            if (type === 'kids') {
                setTempKids(tempKids + 1);
            }
        } else {
            ToastAndroid.show(`Max amount of guests (${maxGuests}) selected.`, ToastAndroid.SHORT)
        }
    };

    /**
     * Decrement the amount of guests.
     * Must have 1 adult at minimum.
     * @param type - Guest type to decrement.
     */
    const decrementGuests = type => {
        if (type === 'adults' && tempAdults > 1) {
            setTempAdults(tempAdults - 1);
        }
        if (type === 'kids' && tempKids > 0) {
            setTempKids(tempKids - 1);
        }
    };

    /**
     * Update guest amounts and close modal.
     */
    const confirmGuestSelection = () => {
        setAdults(tempAdults);
        setKids(tempKids);
        onClose();
    };

    return (
        <Modal transparent={true} visible={true} animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.guestAmountModalContent}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}>
                        <MaterialIcons name="close" size={24} color="#333"/>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Select Guests</Text>
                    <Text style={styles.modalSubTitle}>Maximum amount of guest(s) is {maxGuests}</Text>

                    {/* Adults */}
                    <View style={styles.guestRow}>
                        <Text style={styles.guestType}>Adults</Text>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity onPress={() => decrementGuests('adults')}>
                                <Text style={styles.counterButton}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.counterText}>{tempAdults}</Text>
                            <TouchableOpacity onPress={() => incrementGuests('adults')}>
                                <Text style={styles.counterButton}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Kids */}
                    <View style={styles.guestRow}>
                        <Text style={styles.guestType}>Kids</Text>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity onPress={() => decrementGuests('kids')}>
                                <Text style={styles.counterButton}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.counterText}>{tempKids}</Text>
                            <TouchableOpacity onPress={() => incrementGuests('kids')}>
                                <Text style={styles.counterButton}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Confirm button */}
                    <TouchableOpacity
                        onPress={confirmGuestSelection}
                        style={styles.confirmButton}>
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default GuestsModal;