import {Text, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import TabItem from "../components/TabItem";
import {HOST_REVIEWS_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import React from "react";

const MarketingAndMonitoringView = ({userRole, roles}) => {
    return (
        <View>
            {userRole === roles.host &&
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText
                        textToTranslate={"Marketing & Monitoring"}/></Text>
                    {TabItem(HOST_REVIEWS_SCREEN, 'Reviews')}
                </View>
            }
        </View>
    )
}

export default MarketingAndMonitoringView;