import {Text, TouchableOpacity} from "react-native";
import {styles} from "../styles/styles";
import TranslatedText from "../../../translation/components/TranslatedText";

const TryAgainButton = ({onPress}) => {
    return (
        <TouchableOpacity style={styles.tryAgainButton} onPress={() => onPress()}>
            <Text style={{color: "white",
                fontWeight: "500", fontSize: 16}}><TranslatedText textToTranslate={"Try Again"} /></Text>
        </TouchableOpacity>
    )
}

export default TryAgainButton;