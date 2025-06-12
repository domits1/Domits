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
        {selectedType === 'Boat' ? (
            <SafeAreaView style={styles.safeAreaContainer}>
              <OnboardingBoatSpace
                  formData={formData}
                  updateFormData={updateFormData}
                  reportValidity={reportValidity}
              />
            </SafeAreaView>
        ) : selectedType === 'Camper' ? (
            <SafeAreaView style={styles.safeAreaContainer}>
              <OnboardingCamperSpace
                  formData={formData}
                  updateFormData={updateFormData}
                  reportValidity={reportValidity}
              />
            </SafeAreaView>
        ) : (
            <SafeAreaView style={styles.safeAreaContainer}>
              <OnboardingAnySpace
                  formData={formData}
                  updateFormData={updateFormData}
                  reportValidity={reportValidity}
              />
            </SafeAreaView>
        )}
      </SafeAreaView>
  )
}

export default OnboardingSpace;