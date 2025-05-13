import {SafeAreaView, ScrollView} from "react-native";
import {styles} from "../../appsettings/styles/AppSettingsStyles";
import TabHeader from "../../../components/TabHeader";
import React from "react";

const FeedbackTab = ({}) => {
    return (
        <SafeAreaView style={styles.areaContainer}>
            <ScrollView style={styles.scrollContainer}>
                <TabHeader tabTitle={"Feedback"}/>
            </ScrollView>
        </SafeAreaView>
    )
}

export default FeedbackTab;