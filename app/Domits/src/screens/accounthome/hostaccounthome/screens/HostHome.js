import React from 'react';
import {ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../../context/AuthContext';
import {styles} from '../../styles/AccountHomeStyles';
import NavigateTo from "../../../../navigation/NavigationFunctions";
import TranslatedText from "../../../../features/translation/components/TranslatedText";

const HostHome = ({navigation}) => {
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
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Bookings & Reservations"}/></Text>
                    {/*reservations/CRS*/}
                    {screenListItem(NavigateTo(navigation).home, 'Reservations')}
                    {/*front office*/}
                    {screenListItem(NavigateTo(navigation).home, 'Front office')}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Property Management"}/></Text>
                    {screenListItem(NavigateTo(navigation).hostDashboard, 'Dashboard')}
                    {screenListItem(NavigateTo(navigation).hostOnboarding, 'Onboarding')}
                    {screenListItem(NavigateTo(navigation).hostListings, 'Listings')}
                    {screenListItem(NavigateTo(navigation).hostCalendar, 'Calendar')}
                    {/*housekeeping*/}
                    {screenListItem(NavigateTo(navigation).home, 'Housekeeping')}
                    {/*IoT*/}
                    {screenListItem(NavigateTo(navigation).home, 'IoT')}

                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Financials & Pricing"}/></Text>
                    {/*revenues*/}
                    {screenListItem(NavigateTo(navigation).home, 'Revenues')}
                    {/*finance*/}
                    {screenListItem(NavigateTo(navigation).home, 'Finance')}
                    {/*pricing*/}
                    {screenListItem(NavigateTo(navigation).home, 'Pricing')}
                    {/*reporting*/}
                    {screenListItem(NavigateTo(navigation).home, 'Reports')}
                    {screenListItem(NavigateTo(navigation).hostPayments, 'Payments')}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText
                        textToTranslate={"Marketing & Monitoring"}/></Text>

                    {screenListItem(NavigateTo(navigation).hostReviews, 'Reviews')}
                    {/*distributions*/}
                    {screenListItem(NavigateTo(navigation).home, 'Distributions')}
                    {/*monitoring*/}
                    {screenListItem(NavigateTo(navigation).home, 'Monitoring')}
                    {/*compliance*/}
                    {screenListItem(NavigateTo(navigation).home, 'Compliance')}
                    {/*promo codes*/}
                    {screenListItem(NavigateTo(navigation).home, 'Promo codes')}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Support"}/></Text>
                    {screenListItem(NavigateTo(navigation).hostHelpDesk, 'Host helpdesk')}
                    {/*how Domits works*/}
                    {screenListItem(NavigateTo(navigation).home, 'How Domits works')}
                    {/*feedback*/}
                    {screenListItem(NavigateTo(navigation).helpAndFeedback, 'Feedback')}
                </View>

                <View style={styles.sectionContainer}>
                    {screenListItem(NavigateTo(navigation).hostAccountSettings, 'Settings')}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HostHome;
