import {styles} from "../styles/BookingEngineStyles";
import {Text, View} from "react-native";
import React from "react";

const PricingView = ({adults, kids, nights, property}) => {
    /**
     * Calculate the total cost of a booking.
     * @returns {string} - Summed up costs of a booking.
     */
    const calculateCost = () => {
        return (
            (property.pricing.roomRate * nights) +
            property.pricing.cleaning +
            property.pricing.service
        ).toFixed(2);
    };

    return (
        <View style={styles.priceDetails}>
            <Text style={styles.sectionTitle}>Price details</Text>
            <Text style={styles.sectionContent}>
                {adults} adults - {kids} kids | {nights} nights
            </Text>

            <Text style={styles.priceDetailText}>
                €{Number(property.pricing.roomRate).toFixed(2)} night x {nights} nights - €
                {(property.pricing.roomRate * nights).toFixed(2)}
            </Text>

            <Text style={styles.priceDetailText}>
                Cleaning fee - €{property.pricing.cleaning.toFixed(2)}
            </Text>

            <Text style={styles.priceDetailText}>
                Domits service fee - €{property.pricing.service.toFixed(2)}
            </Text>

            <Text style={styles.total}>Total - €{calculateCost()}</Text>
        </View>
    )
}

export default PricingView;