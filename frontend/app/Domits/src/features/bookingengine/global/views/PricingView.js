import {Text, View} from "react-native";
import {styles} from "../../stripe/styles/styles";
import Spacer from "../../../../components/Spacer";
import LineDivider from "../../../../components/LineDivider";
import TranslatedText from "../../../translation/components/TranslatedText";

const PricingView = ({guests, nights, pricing}) => {
    return (
        <View style={[styles.contentContainer, {maxHeight: 250}]}>
            <View style={styles.content}>
                <View>
                    <Text style={styles.label}><TranslatedText textToTranslate={"Price details"} /></Text>
                    <Text style={styles.textContent}>
                        {guests} <TranslatedText textToTranslate={"Guests"} /> | {nights} <TranslatedText textToTranslate={"Nights"} />
                    </Text>
                    <Spacer />
                    <View style={styles.priceContainer}>
                        <Text style={styles.textContent}>${pricing.roomRate} <TranslatedText textToTranslate={"Per night"} /> x {nights}</Text>
                        <Text style={styles.textContent}>${pricing.roomRate * nights}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={styles.textContent}><TranslatedText textToTranslate={"Cleaning fee"} /></Text>
                        <Text style={styles.textContent}>${pricing.cleaning}</Text>
                    </View>
                    <Spacer />
                    <View style={styles.priceContainer}>
                        <Text style={styles.textContent}><TranslatedText textToTranslate={"Domits service fee"} /></Text>
                        <Text style={styles.textContent}>${pricing.service}</Text>
                    </View>
                    <LineDivider width={"95%"} />
                    <View style={styles.priceContainer}>
                        <Text style={[styles.textContent, {fontWeight: "700"}]}><TranslatedText textToTranslate={"Total (excl. tax)"} /></Text>
                        <Text style={[styles.textContent, {fontWeight: "700"}]}>${(pricing.roomRate * nights) + pricing.cleaning + pricing.service}</Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

export default PricingView;