import {Alert, SafeAreaView, Text, TouchableOpacity, View} from "react-native";
import OnboardingHeader from "../components/OnboardingHeader";
import {useEffect, useState} from "react";
import propertyFormData from "../utils/propertyFormData";
import {produce} from "immer";
import {steps} from "../utils/pageStepsConfig";
import TranslatedText from "../../translation/components/TranslatedText";
import {styles} from "../styles/HostOnboardingStyles";
import {useTranslation} from "react-i18next";
import OnboardingSpace from "../views/onboardingspacetype/screens/OnboardingSpace";
import {HOST_ONBOARDING_CHECK_SCREEN} from "../../../navigation/utils/NavigationNameConstants";

const HostOnboarding = ({navigation}) => {
  const {t} = useTranslation();
  const [formData, setFormData] = useState(propertyFormData);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];
  const CurrentComponent = currentStep.component;
  const [pageStatus, setPageStatus] = useState({
    propertyType: {visited: false, valid: false},
    propertySpace: {visited: false, valid: false},
    propertyName: {visited: false, valid: false},
    propertyLocation: {visited: false, valid: false},
    propertyDescription: {visited: false, valid: false},
    propertyAmountOfGuests: {visited: false, valid: false},
    propertyAmenities: {visited: false, valid: false},
    propertyHouseRules: {visited: false, valid: false},
  });

  const updateFormData = (updaterFn) => {
    setFormData((currentData) => produce(currentData, updaterFn));
  };

  const updatePageStatus = (key, statusUpdate) => {
    setPageStatus((prev) => ({
      ...prev,
      [key]: {...prev[key], ...statusUpdate},
    }));
  };

  const confirmQuitOnboarding = () => {
    return Alert.alert(
        t("Are you sure you want to quit?"),
        t("Entered property data will be lost."),
        [
          {
            text: t("Yes"),
            onPress: () => {
              navigation.goBack()
            }
          },
          {text: t("No")}
        ]
    )
  }

  const goToPrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const goToNext = () => {
    const currentKey = currentStep.key;
    if (!pageStatus[currentKey].valid) {
      Alert.alert(
          t('Incomplete Input'),
          t('Please fill in required fields before proceeding.')
      );
      return;
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const confirmFinishOnboarding = () => {
    const hasInvalid = Object.values(pageStatus).some(value => !value.valid);

    if (hasInvalid) {
      Alert.alert(
          t('Invalid fields'),
          t('Please check that all fields are filled in correctly.'),
      )
    } else {
      Alert.alert(
          t('Finish'),
          t('Are you sure you want to finish the onboarding process?'),
          [
            {
              text: t('Yes'),
              onPress: () => {
                navigation.navigate(HOST_ONBOARDING_CHECK_SCREEN, {formData});
              }
            },
            {text: t('No')},
          ]
      )
    }
  }

  const jumpToStep = (key) => {
    const index = steps.findIndex(step => step.key === key);
    if (index !== -1) {
      setCurrentStepIndex(index);
    }
  };

  const navButton = (text, buttonFunction) => {
    return (
        <TouchableOpacity style={styles.navButton} onPress={buttonFunction}>
          <Text style={styles.navButtonText}>
            <TranslatedText textToTranslate={text}/>
          </Text>
        </TouchableOpacity>
    );
  }

  /**
   * Reset space type when different property type is selected.
   */
  useEffect(() => {
    const step = steps.find(item => item.component === OnboardingSpace);
    updatePageStatus(step.key, {valid: false})
    updateFormData((draft) => {
      draft.propertyType.propertySpace = "";
    });
  }, [formData.propertyType.property_type])

  return (
      <View style={{flex: 1}}>
        <OnboardingHeader headerTitle={currentStep.title} jumpToStep={jumpToStep} pageStatus={pageStatus}/>

        <SafeAreaView style={{flex: 1}}>
          <CurrentComponent
              formData={formData}
              updateFormData={updateFormData}
              reportValidity={(isValid) =>
                  updatePageStatus(currentStep.key, {valid: isValid, visited: true})
              }
              markVisited={() => updatePageStatus(currentStep.key, {visited: true})}
          />
        </SafeAreaView>

        <View style={styles.navButtonContainer}>
          {currentStepIndex === 0 && (
              navButton("Quit", confirmQuitOnboarding)
          )}
          {currentStepIndex > 0 && (
              navButton("Back", goToPrevious)
          )}
          {currentStepIndex < steps.length - 1 && (
              navButton("Next", goToNext)
          )}
          {currentStepIndex === steps.length - 1 && (
              navButton("Finish", confirmFinishOnboarding)
          )}
        </View>
      </View>
  )
}

export default HostOnboarding;