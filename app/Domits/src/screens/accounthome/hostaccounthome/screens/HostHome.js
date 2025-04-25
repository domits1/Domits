import React from 'react';
import {ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../../context/AuthContext';
import {styles} from '../../styles/AccountHomeStyles';
import {
    FEEDBACK_SCREEN,
    HOST_ACCOUNT_SETTINGS_SCREEN,
    HOST_CALENDAR_SCREEN,
    HOST_DASHBOARD_SCREEN,
    HOST_HELP_DESK_SCREEN,
    HOST_LISTINGS_SCREEN,
    HOST_ONBOARDING_SCREEN,
    HOST_PAYMENTS_SCREEN,
    HOST_REVIEWS_SCREEN
} from "../../../../navigation/utils/NavigationNameConstants";

const HostHome = ({navigation}) => {
    const {userAttributes} = useAuth();
    const firstName = userAttributes?.given_name || 'N/A';

    const screenListItem = (navigationName, screenName) => {
        return (
            <View>
                <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => navigation.navigate(navigationName) }>
                    <Text style={styles.listItemText}>{screenName}</Text>
                    <MaterialIcons name="chevron-right" size={22} color="#000"/>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <SafeAreaView style={{flex: 1}}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.welcomeText}>Welcome: {firstName}</Text>
                    <Text style={styles.descriptionText}>
                        Manage your profile, see your payments, add or remove reviews and
                        change app settings.
                    </Text>
                </View>
                {screenListItem(HOST_DASHBOARD_SCREEN, 'Dashboard')}
                {screenListItem(HOST_ONBOARDING_SCREEN, 'Onboarding')}
                {screenListItem(HOST_CALENDAR_SCREEN, 'Calendar')}
                {screenListItem(HOST_PAYMENTS_SCREEN, 'Payments')}
                {screenListItem(HOST_LISTINGS_SCREEN, 'Listings')}
                {screenListItem(HOST_ACCOUNT_SETTINGS_SCREEN, 'Settings')}
                {screenListItem(HOST_REVIEWS_SCREEN, 'Reviews')}
                {screenListItem(HOST_HELP_DESK_SCREEN, 'Helpdesk')}
                <View style={styles.helpSection}>
                    <Text style={styles.helpText}>
                        Do you have trouble with using our app?{'\n'}Please send a support
                        request to Domits.
                    </Text>
                    {screenListItem(FEEDBACK_SCREEN, 'Help and Feedback')}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HostHome;
