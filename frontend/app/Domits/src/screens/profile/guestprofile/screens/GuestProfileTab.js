import React from 'react';
import {ScrollView, Text, View,} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {styles} from '../../styles/ProfileStyles';
import UserInformationComponent from "../../components/UserInformationComponent";

const GuestProfileTab = () => {

    return (
        <SafeAreaView style={{flex: 1}}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>Profile of guest</Text>
                </View>

                <UserInformationComponent></UserInformationComponent>

            </ScrollView>
        </SafeAreaView>
    );
};

export default GuestProfileTab;
