import {Text, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import React, {useEffect, useState} from "react";
import FetchOwnerData from "../../../features/search/hooks/FetchOwnerData";

const PropertyDetailsOwnerView = ({ownerId, navigation}) => {
    const [owner, setOwner] = useState();

    useEffect(() => {
        FetchOwnerData(ownerId, setOwner).then().catch(error => {
            console.error('Error fetching owner data:', error);
        });
    }, [ownerId]);

    return (
        <View>
            <Text style={styles.categoryTitle}><TranslatedText textToTranslate={"hosted by"}/></Text>
            <View style={styles.hostInfoContainer}>
                <View style={styles.nameButton}>
                    <Text style={styles.nameText}>{owner.given_name} {owner.family_name}</Text>
                </View>
            </View>
            <View>
                <Text>{owner.email}</Text>
            </View>
        </View>
    )
}

export default PropertyDetailsOwnerView;