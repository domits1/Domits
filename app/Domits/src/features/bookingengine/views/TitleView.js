import {Text} from "react-native";
import {styles} from "../styles/BookingEngineStyles";
import React from "react";

const TitleView = ({property}) => {
    return (
        <>
            <Text style={styles.title}>{property.property.title}</Text>
            <Text style={styles.description}>
                {property.property.description}
            </Text>
        </>
    )
}

export default TitleView;