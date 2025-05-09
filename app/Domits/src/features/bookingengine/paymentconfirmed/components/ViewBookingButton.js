import {Text, TouchableOpacity} from "react-native";
import {styles} from "../styles/styles";

const ViewBookingButton = ({onPress}) => {
    return (
        <TouchableOpacity style={styles.viewBookingButton} onPress={() => onPress()}>
            <Text style={{color: "white",
                fontWeight: "500", fontSize: 16}}>View booking</Text>
        </TouchableOpacity>
    )
}

export default ViewBookingButton;