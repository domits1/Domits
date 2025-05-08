import {Text, TouchableOpacity} from "react-native";
import {styles} from "../styles/styles"

const ConfirmAndPayButton = () => {
    return (
        <TouchableOpacity style={styles.confirmAndPayButton}>
            <Text style={{color: "white",
                fontWeight: "500", fontSize: 16}}>Confirm & Pay</Text>
        </TouchableOpacity>
    )
}

export default ConfirmAndPayButton;