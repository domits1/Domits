import {Text, TouchableOpacity} from "react-native";
import {styles} from "../styles/styles"
import TranslatedText from "../../../translation/components/TranslatedText";

const ConfirmAndPayButton = ({onPress}) => {
    return (
        <TouchableOpacity style={styles.confirmAndPayButton} onPress={() => onPress()}>
            <Text style={{color: "white",
                fontWeight: "500", fontSize: 16}}><TranslatedText textToTranslate={"Confirm & Pay"} /></Text>
        </TouchableOpacity>
    )
}

export default ConfirmAndPayButton;