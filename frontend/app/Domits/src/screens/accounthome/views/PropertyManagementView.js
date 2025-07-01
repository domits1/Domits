import {styles} from "../styles/AccountHomeStyles";
import {Text, View} from "react-native";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import TabItem from "../components/TabItem";
import {HOST_CALENDAR_SCREEN, HOST_PROPERTIES_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import React from "react";

const PropertyManagementView = ({userRole, roles}) => {
    return (
        <View>
            {userRole === roles.host &&
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText
                        textToTranslate={"Property Management"}/></Text>
                    {TabItem(HOST_PROPERTIES_SCREEN, 'Properties')}
                    {TabItem(HOST_CALENDAR_SCREEN, 'Calendar & Prices')}
                </View>
            }
        </View>
    )
}

export default PropertyManagementView;