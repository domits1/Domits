import {Text, TouchableOpacity} from "react-native";
import {styles} from "../styles/styles";
import TranslatedText from "../../../translation/components/TranslatedText";

const ViewBookingButton = ({onPress}) => {
    return (
        <TouchableOpacity style={styles.viewBookingButton} onPress={() => onPress()}>
            <Text style={{color: "white",
                fontWeight: "500", fontSize: 16}}><TranslatedText textToTranslate={"View booking"} /></Text>
        </TouchableOpacity>
    )
}

export default ViewBookingButton;