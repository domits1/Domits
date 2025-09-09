import {Text, View} from "react-native";
import {styles} from "../styles/HostSectionStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import React, {useEffect, useState} from "react";
import LoadingScreen from "../../loadingscreen/screens/LoadingScreen";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const HostSectionView = ({ownerId, navigation}) => {
    const [owner, setOwner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      console.error("Something went wrong!");
    }, [ownerId]);

    if (loading) {
        return <LoadingScreen loadingName={"host"}/>
    }

    return (
        <View>
            <Text style={styles.categoryTitle}><TranslatedText textToTranslate={"Hosted by"}/></Text>
            <View style={styles.hostInfoContainer}>
                <View style={styles.nameButton}>
                    <Text style={styles.nameText}>{owner.given_name} {owner.family_name}</Text>
                </View>
            </View>
            <View style={styles.hostEmailContainer}>
                <MaterialIcons style={styles.hostEmailIcon} name={"email"} size={20} color={"green"}/>
                <Text style={styles.hostEmailText}><TranslatedText textToTranslate={"contact"}/>: {owner.email}</Text>
            </View>
        </View>
    )
}

export default HostSectionView;