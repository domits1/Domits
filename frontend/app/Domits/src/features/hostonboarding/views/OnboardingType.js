import {Text, View} from "react-native";
import {useEffect} from "react";

const OnboardingType = ({updateFormData, reportValidity, markVisited}) => {
    useEffect(() => {
        markVisited(true);
        //todo User input and validity
        updateFormData((draft) => {
            draft.propertyType.property_type = "Big boat";
        });
        reportValidity(true);
    }, []);

  return (
      <View>
        <Text>hello world I am type</Text>
      </View>
  )
}

export default OnboardingType;