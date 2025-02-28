import {Modal, Text, ToastAndroid, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import React from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const BookingPopup = ({onClose, startDate, endDate}) => {

    const handleOnBookPress = () => {
        ToastAndroid.show("Sorry, we currently do not accept bookings.", ToastAndroid.SHORT)
    }

    return (
        <Modal transparent={true} visible={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}>
                        <MaterialIcons name="close" size={24} color="#333"/>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        Your booking
                    </Text>
                    <Text> from {startDate} to {endDate}</Text>

                    <View style={styles.bookingButtonContainer}>
                        <View style={styles.bookingButton}>
                            <TouchableOpacity onPress={handleOnBookPress} style={styles.bookingButtonContent}>
                                <Text style={styles.bookingButtonText}>Book</Text>
                                <Ionicons name={'arrow-forward-circle-outline'} size={24}
                                          style={styles.bookingButtonIcon}></Ionicons>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

export default BookingPopup;