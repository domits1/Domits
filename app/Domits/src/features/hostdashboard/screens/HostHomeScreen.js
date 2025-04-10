import React from 'react';
import {ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../context/AuthContext';
import {styles} from "../styles/HostDashboardStyles";
import NavigateTo from "../../../navigation/NavigationFunctions";

const HostHomeScreen = () => {
    const {userAttributes} = useAuth();
    const firstName = userAttributes?.given_name || 'N/A';

    const screenListItem = (navigationFunction, screenName) => {
        return (
            <View>
                <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => navigationFunction() }>
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
                {screenListItem(NavigateTo().hostDashboard, 'Dashboard')}
                {screenListItem(NavigateTo().onboardingHost, 'Onboarding')}
                {screenListItem(NavigateTo().hostCalendar, 'Calendar')}
                {screenListItem(NavigateTo().hostPayments, 'Payments')}
                {screenListItem(NavigateTo().hostListings, 'Listings')}
                {screenListItem(NavigateTo().hostSettings, 'Settings')}
                {screenListItem(NavigateTo().hostReviews, 'Reviews')}
                {screenListItem(NavigateTo().hostHelpDesk, 'Helpdesk')}
                <View style={styles.helpSection}>
                    <Text style={styles.helpText}>
                        Do you have trouble with using our app?{'\n'}Please send a support
                        request to Domits.
                    </Text>
                    {screenListItem(NavigateTo().helpAndFeedback, 'Help and Feedback')}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HostHomeScreen;
