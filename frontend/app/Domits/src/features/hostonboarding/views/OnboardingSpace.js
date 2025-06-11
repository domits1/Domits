import {Text, View} from "react-native";
import {useEffect} from "react";

const OnboardingSpace = ({updateFormData, reportValidity, markVisited}) => {

    useEffect(() => {
        markVisited(true);
        //todo User input and validity
        updateFormData((draft) => {
            draft.propertyType.spaceType = "Entire home";
        });
        reportValidity(true);
    }, []);

    return (
        <View>
            <Text>hello world I am space</Text>
        </View>
    )
}

export default OnboardingSpace;