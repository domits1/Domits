import {SafeAreaView, ScrollView} from "react-native";
import {styles} from "../styles/AppSettingsStyles";
import React from "react";
import TabHeader from "../../../components/TabHeader";

const AppSettingsTab = ({}) => {
    return (
        <SafeAreaView style={styles.areaContainer}>
            <ScrollView style={styles.scrollContainer}>
                <TabHeader tabTitle={"App settings"}/>
            </ScrollView>
        </SafeAreaView>
    )
}

export default AppSettingsTab;