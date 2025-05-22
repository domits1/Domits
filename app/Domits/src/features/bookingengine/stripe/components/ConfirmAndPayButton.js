import {Text, TouchableOpacity} from "react-native";
import {styles} from "../styles/styles"
import TranslatedText from "../../../translation/components/TranslatedText";

const ConfirmAndPayButton = ({onPress, text}) => {
    return (
        <TouchableOpacity style={styles.confirmAndPayButton} onPress={() => onPress()}>
            <Text style={{color: "white",
                fontWeight: "500", fontSize: 16}}><TranslatedText textToTranslate={text} /></Text>
        </TouchableOpacity>
    )
}

export default ConfirmAndPayButton;