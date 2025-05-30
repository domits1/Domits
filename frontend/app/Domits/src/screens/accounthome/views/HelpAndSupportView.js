import {Text, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import TabItem from "../components/TabItem";
import {FEEDBACK_SCREEN, HOST_HELP_DESK_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import React from "react";

const HelpAndSupportView = ({userRole, roles}) => {
    return (
        <View>
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Help & Support"}/></Text>
                {TabItem(FEEDBACK_SCREEN, 'Feedback')}

                {userRole === roles.host &&
                    <View>
                        {TabItem(HOST_HELP_DESK_SCREEN, 'Helpdesk')}
                    </View>
                }
            </View>
        </View>
    )
}

export default HelpAndSupportView;