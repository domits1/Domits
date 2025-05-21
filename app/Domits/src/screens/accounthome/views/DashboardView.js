import {Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import TabItem from "../components/TabItem";
import {ACCOUNT_DASHBOARD_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import LogoutAccount from "../../../features/auth/LogoutAccount";
import React from "react";
import {useNavigation} from "@react-navigation/native";
import {useAuth} from "../../../context/AuthContext";

const DashboardView = ({userRole, roles, setLoading}) => {
    const navigation = useNavigation();
    const {checkAuth} = useAuth();

    return (
        <View>
            {
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Account"}/></Text>
                    {TabItem(ACCOUNT_DASHBOARD_SCREEN, 'Dashboard')}
                    {/* Log out */}
                    <View>
                        <TouchableOpacity
                            style={styles.tabItem}
                            onPress={() => LogoutAccount(navigation, checkAuth)}>
                            <Text style={styles.logOutButtonText}>
                                <TranslatedText textToTranslate={'Logout'}/>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            }
        </View>
    )
}

export default DashboardView;