import {Text, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import TabItem from "../components/TabItem";
import {HOST_PAYMENTS_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import React from "react";

const FinancialsAndPricingView = ({userRole, roles}) => {
    return (
        <View>
            {userRole === roles.host &&
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText
                        textToTranslate={"Financials & Pricing"}/></Text>
                    {TabItem(HOST_PAYMENTS_SCREEN, 'Payments')}
                </View>
            }
        </View>
    )
}

export default FinancialsAndPricingView;