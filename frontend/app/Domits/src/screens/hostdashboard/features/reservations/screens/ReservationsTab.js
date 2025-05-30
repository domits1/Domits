import {SafeAreaView, ScrollView} from "react-native";
import {styles} from "../../../../accounthome/features/appsettings/styles/AppSettingsStyles";
import TabHeader from "../../../../accounthome/components/TabHeader";
import React from "react";

const ReservationsTab = ({}) => {
    return (
        <SafeAreaView style={styles.areaContainer}>
            <ScrollView style={styles.scrollContainer}>
                <TabHeader tabTitle={"Reservations"}/>
            </ScrollView>
        </SafeAreaView>
    )
}

export default ReservationsTab;