import {Text, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import {HOST_ONBOARDING_LANDING_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import React from "react";
import TabItem from "../components/TabItem";

const HostOnboardingView = ({userRole, roles}) => {
    return (
        <View>
            {userRole === roles.guest &&
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>
                        <TranslatedText textToTranslate={"Become a host"}/>
                    </Text>
                    {TabItem(HOST_ONBOARDING_LANDING_SCREEN, 'List your property')}
                </View>
            }
        </View>
    )
}

export default HostOnboardingView;