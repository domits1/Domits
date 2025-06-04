import {Text, View} from "react-native";
import React from "react";

const PricingView = ({property, nights}) => {
    return (
        <View>
            <Text testID={"propertyDetailsRoomRate"}>
                Nights: €{(property.pricing.roomRate * nights).toFixed(2)}
            </Text>
            <Text testID={"propertyDetailsCleaning"}>
                Cleaning fee: €{property.pricing.cleaning.toFixed(2)}
            </Text>
            <Text testID={"propertyDetailsService"}>
                Service fee: €{((property.pricing.roomRate * nights).toFixed(2)) * 0.15}
            </Text>
            <Text testID={"propertyDetailsTotalCost"}>Total cost: {(
                property.pricing.roomRate * nights * 1.15 +
                property.pricing.cleaning
            ).toFixed(2)}</Text>
        </View>
    )
}

export default PricingView;