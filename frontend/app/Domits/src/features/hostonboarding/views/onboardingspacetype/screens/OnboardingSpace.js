import {SafeAreaView, Text, View} from "react-native";
import {useEffect} from "react";
import OnboardingBoatSpace from "../views/OnboardingBoatSpace";
import {styles} from "../../../styles/HostOnboardingStyles";
import OnboardingCamperSpace from "../views/OnboardingCamperSpace";
import OnboardingAnySpace from "../views/OnboardingAnySpace";

const OnboardingSpace = ({formData, updateFormData, reportValidity, markVisited}) => {
  const selectedType = formData.propertyType.property_type;

  useEffect(() => {
    markVisited(true);
  }, []);

  return (
      <SafeAreaView style={[styles.safeAreaNavMargin, styles.safeAreaContainer]}>
        <SafeAreaView style={styles.safeAreaContainer}>
          <View style={styles.contentContainer}>
            {selectedType === 'Boat' ? (
                <OnboardingBoatSpace
                    formData={formData}
                    updateFormData={updateFormData}
                    reportValidity={reportValidity}
                />
            ) : selectedType === 'Camper' ? (
                <OnboardingCamperSpace
                    formData={formData}
                    updateFormData={updateFormData}
                    reportValidity={reportValidity}
                />
            ) : (
                <OnboardingAnySpace
                    formData={formData}
                    updateFormData={updateFormData}
                    reportValidity={reportValidity}
                />
            )}
          </View>
        </SafeAreaView>
      </SafeAreaView>
  )
}

export default OnboardingSpace;