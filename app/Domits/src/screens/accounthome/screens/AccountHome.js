import {SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/AccountHomeStyles";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import React, {useEffect, useState} from "react";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import {useAuth} from "../../../context/AuthContext";
import {
    ACCOUNT_DASHBOARD_SCREEN,
    APP_SETTINGS_SCREEN,
    FEEDBACK_SCREEN,
    GUEST_BOOKINGS_SCREEN,
    GUEST_DASHBOARD_SCREEN,
    GUEST_PAYMENT_METHODS_SCREEN,
    GUEST_REVIEWS_SCREEN, GUEST_SETTINGS_SCREEN,
    HOST_CALENDAR_SCREEN, HOST_DASHBOARD_SCREEN,
    HOST_HELP_DESK_SCREEN,
    HOST_LISTINGS_SCREEN,
    HOST_ONBOARDING_LANDING_SCREEN,
    HOST_PAYMENTS_SCREEN, HOST_RESERVATIONS_SCREEN, HOST_REVIEWS_SCREEN, LOGIN_SCREEN
} from "../../../navigation/utils/NavigationNameConstants";
import LogoutAccount from "../../../features/auth/LogoutAccount";
import {useFocusEffect} from "@react-navigation/native";
import LoadingScreen from "../../loadingscreen/screens/LoadingScreen";

const AccountHome = ({navigation}) => {
    const {isAuthenticated, user, userAttributes, checkAuth} = useAuth();
    const [loading, setLoading] = useState(true);
    const firstName = userAttributes?.given_name || 'N/A';
    const userRole = userAttributes['custom:group'];
    const hostUserRole = 'Host';
    const guestUserRole = 'Traveler';

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

    const tabItem = (navigationName, itemName) => {
        return (
            <View>
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => navigation.navigate(navigationName) }>
                    <Text style={styles.tabItemText}>
                        <TranslatedText textToTranslate={itemName}/>
                    </Text>
                    <MaterialIcons name="chevron-right" size={22} color="#000"/>
                </TouchableOpacity>
            </View>
        )
    }

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

                    {/* Dashboard */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Account"}/></Text>
                        {tabItem(ACCOUNT_DASHBOARD_SCREEN, 'Dashboard')}
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

                    {/* Bookings */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Bookings"}/></Text>
                        {userRole === guestUserRole &&
                            <View>
                                {tabItem(GUEST_BOOKINGS_SCREEN, 'Bookings')}
                                {tabItem(GUEST_PAYMENT_METHODS_SCREEN, 'Payments')}
                                {tabItem(GUEST_REVIEWS_SCREEN, 'Reviews')}
                            </View>
                        }

                        {userRole === hostUserRole &&
                            <View>
                                {tabItem(HOST_RESERVATIONS_SCREEN, 'Reservations')}
                            </View>
                        }
                    </View>

                    {userRole === hostUserRole &&
                        <View>
                            {/* Property management*/}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}><TranslatedText
                                    textToTranslate={"Property Management"}/></Text>
                                {tabItem(HOST_LISTINGS_SCREEN, 'Properties')}
                                {tabItem(HOST_CALENDAR_SCREEN, 'Calendar & Prices')}
                            </View>
                            {/*Financials & Pricing */}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}><TranslatedText
                                    textToTranslate={"Financials & Pricing"}/></Text>
                                {tabItem(HOST_PAYMENTS_SCREEN, 'Payments')}
                            </View>
                            {/* Marketing & Monitoring*/}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}><TranslatedText
                                    textToTranslate={"Marketing & Monitoring"}/></Text>
                                {tabItem(HOST_REVIEWS_SCREEN, 'Reviews')}
                            </View>
                        </View>
                    }

                    {/* Preferences */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Preferences"}/></Text>
                        {/*todo*/}
                        {tabItem(APP_SETTINGS_SCREEN, 'Settings')}
                    </View>

                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Help & Support"}/></Text>
                        {tabItem(FEEDBACK_SCREEN, 'Feedback')}

                        {userRole === hostUserRole &&
                            <View>
                                {tabItem(HOST_HELP_DESK_SCREEN, 'Helpdesk')}
                            </View>
                        }
                    </View>

                    {/* Host onboarding */}
                    {userRole === guestUserRole &&
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>
                                <TranslatedText textToTranslate={"Become a host"}/>
                            </Text>
                            {tabItem(HOST_ONBOARDING_LANDING_SCREEN, 'List your property')}
                        </View>
                    }

                </ScrollView>
            </SafeAreaView>
        )
    }
}

export default AccountHome;