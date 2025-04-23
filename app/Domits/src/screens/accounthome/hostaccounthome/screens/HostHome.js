import React from 'react';
import {ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../../context/AuthContext';
import {styles} from '../../styles/AccountHomeStyles';
import {
    HOME_SCREEN,
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
import TranslatedText from "../../../../features/translation/components/TranslatedText";

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
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Bookings & Reservations"}/></Text>
                    {/*reservations/CRS*/}
                    {screenListItem(HOME_SCREEN, 'Reservations')}
                    {/*front office*/}
                    {screenListItem(HOME_SCREEN, 'Front office')}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Property Management"}/></Text>
                    {screenListItem(HOST_DASHBOARD_SCREEN, 'Dashboard')}
                    {screenListItem(HOST_ONBOARDING_SCREEN, 'Onboarding')}
                    {screenListItem(HOST_LISTINGS_SCREEN, 'Listings')}
                    {screenListItem(HOST_CALENDAR_SCREEN, 'Calendar')}
                    {/*housekeeping*/}
                    {screenListItem(HOME_SCREEN, 'Housekeeping')}
                    {/*IoT*/}
                    {screenListItem(HOME_SCREEN, 'IoT')}

                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Financials & Pricing"}/></Text>
                    {/*revenues*/}
                    {screenListItem(HOME_SCREEN, 'Revenues')}
                    {/*finance*/}
                    {screenListItem(HOME_SCREEN, 'Finance')}
                    {/*pricing*/}
                    {screenListItem(HOME_SCREEN, 'Pricing')}
                    {/*reporting*/}
                    {screenListItem(HOME_SCREEN, 'Reports')}
                    {screenListItem(HOST_PAYMENTS_SCREEN, 'Payments')}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText
                        textToTranslate={"Marketing & Monitoring"}/></Text>

                    {screenListItem(HOST_REVIEWS_SCREEN, 'Reviews')}
                    {/*distributions*/}
                    {screenListItem(HOME_SCREEN, 'Distributions')}
                    {/*monitoring*/}
                    {screenListItem(HOME_SCREEN, 'Monitoring')}
                    {/*compliance*/}
                    {screenListItem(HOME_SCREEN, 'Compliance')}
                    {/*promo codes*/}
                    {screenListItem(HOME_SCREEN, 'Promo codes')}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}><TranslatedText textToTranslate={"Support"}/></Text>
                    {screenListItem(HOST_HELP_DESK_SCREEN, 'Helpdesk')}
                    {/*how Domits works*/}
                    {screenListItem(HOME_SCREEN, 'How Domits works')}
                    {/*feedback*/}
                    {screenListItem(FEEDBACK_SCREEN, 'Feedback')}
                </View>

                <View style={styles.sectionContainer}>
                    {screenListItem(HOST_ACCOUNT_SETTINGS_SCREEN, 'Settings')}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HostHome;
