import {Modal, Pressable, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/BookingEngineStyles";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import CalendarComponent from "../../calendar/CalendarComponent";
import React from "react";

const CalendarView = ({
                          showDatePopUp,
                          setShowDatePopUp,
                          firstSelectedDate,
                          setFirstSelectedDate,
                          lastSelectedDate,
                          setLastSelectedDate,
                          property
                      }) => {
    return (
        <>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dates</Text>
                <Text style={styles.sectionContent}>
                    {firstSelectedDate && lastSelectedDate
                        ? `${firstSelectedDate} - ${lastSelectedDate}`
                        : 'Choose dates'}
                </Text>
                <TouchableOpacity onPress={() => setShowDatePopUp(!showDatePopUp)}>
                    <Text style={styles.linkText}>Change</Text>
                </TouchableOpacity>
            </View>
            <Modal
                animationType="fade"
                transparent={true}
                visible={showDatePopUp}
                onRequestClose={() => setShowDatePopUp(false)}
            >
                <Pressable onPress={() => setShowDatePopUp(false)} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowDatePopUp(false)}>
                            <MaterialIcons name="close" size={24} color="#333"/>
                        </TouchableOpacity>
                        {showDatePopUp && (
                            <CalendarComponent
                                firstDateSelected={firstSelectedDate}
                                onFirstDateSelected={date => setFirstSelectedDate(date)}
                                lastDateSelected={lastSelectedDate}
                                onLastDateSelected={date => setLastSelectedDate(date)}
                                property={property}
                                clickEnabled={true}
                            />
                        )}
                    </View>
                </Pressable>
            </Modal>
        </>
    )
}

export default CalendarView;