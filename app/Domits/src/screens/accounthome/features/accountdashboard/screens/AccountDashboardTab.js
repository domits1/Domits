import {SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/AccountDashboardStyles";
import TabHeader from "../../../components/TabHeader";
import React from "react";
import DeleteAccount from "../../../../../features/auth/DeleteAccount";
import TranslatedText from "../../../../../features/translation/components/TranslatedText";
import {useAuth} from "../../../../../context/AuthContext";
import {useNavigation} from "@react-navigation/native";

const AccountDashboardTab = ({}) => {
    const navigation = useNavigation();
    const {isAuthenticated, user, checkAuth} = useAuth();

    return (
        <SafeAreaView style={styles.areaContainer}>
            <ScrollView style={styles.scrollContainer}>
                <TabHeader tabTitle={"Dashboard"}/>

                <View style={styles.items}>
                    <TouchableOpacity
                        onPress={() => DeleteAccount(user.userId, navigation)}
                        style={styles.listItem}>
                        <Text style={styles.listItemText}>
                            <TranslatedText textToTranslate={'delete account'}/>
                        </Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    )
}

export default AccountDashboardTab;