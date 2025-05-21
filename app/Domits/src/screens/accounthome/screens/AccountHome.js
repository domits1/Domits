import {SafeAreaView, ScrollView, Text, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import React, {useState} from "react";
import {useAuth} from "../../../context/AuthContext";
import {LOGIN_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import {useFocusEffect} from "@react-navigation/native";
import LoadingScreen from "../../loadingscreen/screens/LoadingScreen";
import HostOnboardingView from "../views/HostOnboardingView";
import PreferencesView from "../views/PreferencesView";
import HelpAndSupportView from "../views/HelpAndSupportView";
import MarketingAndMonitoringView from "../views/MarketingAndMonitoringView";
import FinancialsAndPricingView from "../views/FinancialsAndPricingView";
import PropertyManagementView from "../views/PropertyManagementView";
import BookingsView from "../views/BookingsView";
import DashboardView from "../views/DashboardView";

const AccountHome = ({navigation}) => {
    const {isAuthenticated, user, userAttributes} = useAuth();
    const [loading, setLoading] = useState(true);
    const firstName = userAttributes?.given_name || 'N/A';
    const userRole = userAttributes['custom:group'];
    const roles = {
        host: 'Host',
        guest: 'Traveler',
    }

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            if (!isAuthenticated) {
                navigation.navigate(LOGIN_SCREEN);
            } else {
                setLoading(false);
            }
        }, [isAuthenticated, navigation]),
    );

    if (loading) {
        return (
            <LoadingScreen loadingName={'account'}/>
        );
    } else {
        return (
            <SafeAreaView style={{flex: 1}}>
                <ScrollView style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.welcomeText}>Welcome: {firstName}</Text>
                    </View>

                    <DashboardView userRole={userRole} roles={roles} setLoading={setLoading}/>
                    <BookingsView userRole={userRole} roles={roles}/>
                    <PropertyManagementView userRole={userRole} roles={roles}/>
                    <FinancialsAndPricingView userRole={userRole} roles={roles}/>
                    <MarketingAndMonitoringView userRole={userRole} roles={roles}/>
                    <PreferencesView userRole={userRole} roles={roles}/>
                    <HelpAndSupportView userRole={userRole} roles={roles}/>
                    <HostOnboardingView userRole={userRole} roles={roles}/>

                </ScrollView>
            </SafeAreaView>
        )
    }
}

export default AccountHome;