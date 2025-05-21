import {styles} from "../styles/propertyDetailsStyles";
import {Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";

const BookingView = ({handleOnBookPress}) => {
    return (
        <View style={styles.bookingButtonContainer}>
            <View style={styles.bookingButton}>
                <TouchableOpacity
                    onPress={handleOnBookPress}
                    style={styles.bookingButtonContent}>
                    <Text style={styles.bookingButtonText}>
                        <TranslatedText textToTranslate={'Book'}/>
                    </Text>
                    <Ionicons
                        name={'arrow-forward-circle-outline'}
                        size={24}
                        style={styles.bookingButtonIcon}
                    />
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default BookingView;