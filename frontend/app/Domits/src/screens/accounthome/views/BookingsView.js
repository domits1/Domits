import {Text, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import TabItem from "../components/TabItem";
import {
    GUEST_BOOKINGS_SCREEN,
    GUEST_PAYMENT_METHODS_SCREEN,
    GUEST_REVIEWS_SCREEN,
    HOST_RESERVATIONS_SCREEN
} from "../../../navigation/utils/NavigationNameConstants";
import React from "react";

const BookingsView = ({userRole, roles}) => {
    return (
        <View>
            {
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Bookings"}/></Text>
                    {userRole === roles.guest &&
                        <View>
                            {TabItem(GUEST_BOOKINGS_SCREEN, 'Bookings')}
                            {TabItem(GUEST_PAYMENT_METHODS_SCREEN, 'Payments')}
                            {TabItem(GUEST_REVIEWS_SCREEN, 'Reviews')}
                        </View>
                    }

                    {userRole === roles.host &&
                        <View>
                            {TabItem(HOST_RESERVATIONS_SCREEN, 'Reservations')}
                        </View>
                    }
                </View>
            }
        </View>
    )
}

export default BookingsView;