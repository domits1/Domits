import {Text, TouchableOpacity} from "react-native";
import {styles} from "../styles/styles"

const ConfirmAndPayButton = ({onPress}) => {
    return (
        <TouchableOpacity style={styles.confirmAndPayButton} onPress={() => onPress()}>
            <Text style={{color: "white",
                fontWeight: "500", fontSize: 16}}>Confirm & Pay</Text>
        </TouchableOpacity>
    )
}

export default ConfirmAndPayButton;