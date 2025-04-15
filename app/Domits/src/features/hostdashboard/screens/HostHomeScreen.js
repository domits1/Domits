import React from 'react';
import {ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../context/AuthContext';
import {styles} from "../styles/HostDashboardStyles";
import NavigateTo from "../../../navigation/NavigationFunctions";

const HostHomeScreen = ({navigation}) => {
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
                {screenListItem(NavigateTo(navigation).hostDashboard, 'Dashboard')}
                {screenListItem(NavigateTo(navigation).onboardingHost, 'Onboarding')}
                {screenListItem(NavigateTo(navigation).hostCalendar, 'Calendar')}
                {screenListItem(NavigateTo(navigation).hostPayments, 'Payments')}
                {screenListItem(NavigateTo(navigation).hostListings, 'Listings')}
                {screenListItem(NavigateTo(navigation).hostSettings, 'Settings')}
                {screenListItem(NavigateTo(navigation).hostReviews, 'Reviews')}
                {screenListItem(NavigateTo(navigation).hostHelpDesk, 'Helpdesk')}
                <View style={styles.helpSection}>
                    <Text style={styles.helpText}>
                        Do you have trouble with using our app?{'\n'}Please send a support
                        request to Domits.
                    </Text>
                    {screenListItem(NavigateTo(navigation).helpAndFeedback, 'Help and Feedback')}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HostHomeScreen;
