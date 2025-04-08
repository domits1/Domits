import React from 'react';
import {ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../context/AuthContext';
import {styles} from "../styles/HostDashboardStyles";

const HostDashboard = ({navigation}) => {
    const {userAttributes} = useAuth();
    const firstName = userAttributes?.given_name || 'N/A';

    const screenListItem = (screenNavigationName, screenName) => {
        return (
            <View>
                <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => navigation.navigate(screenNavigationName)}>
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
                {screenListItem('HostDashboardTab', 'Dashboard')}
                {screenListItem('OnboardingHost', 'Onboarding')}
                {screenListItem('HostCalendar', 'Calendar')}
                {screenListItem('HostPayments', 'Payments')}
                {screenListItem('HostListings', 'Listings')}
                {screenListItem('HostSettings', 'Settings')}
                {screenListItem('HostReviews', 'Reviews')}
                {screenListItem('HostHelpDesk', 'Helpdesk')}
                <View style={styles.helpSection}>
                    <Text style={styles.helpText}>
                        Do you have trouble with using our app?{'\n'}Please send a support
                        request to Domits.
                    </Text>
                    {screenListItem('HelpAndFeedback', 'Help and Feedback')}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HostDashboard;
