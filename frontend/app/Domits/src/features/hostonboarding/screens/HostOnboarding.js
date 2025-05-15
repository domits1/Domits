import {Alert, Button, ScrollView, View} from "react-native";
import OnboardingHeader from "../components/OnboardingHeader";
import {useEffect, useState} from "react";
import propertyFormData from "../utils/propertyFormData";
import {produce} from "immer";
import OnboardingType from "../views/OnboardingType";
import {steps} from "../utils/pageStepsConfig";

const HostOnboarding = () => {
    const [formData, setFormData] = useState(propertyFormData);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const currentStep = steps[currentStepIndex];
    const CurrentComponent = currentStep.component;
    const [pageStatus, setPageStatus] = useState({
        propertyType: {visited: false, valid: false},
        propertySpace: {visited: false, valid: false},
        propertyName: {visited: false, valid: false},
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

    const goToNext = () => {
        const currentKey = currentStep.key;

        if (!pageStatus[currentKey].valid) {
            Alert.alert(
                'Incomplete Input',
                'Please fill in required fields before proceeding.'
            );
            return;
        }
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        }
    };

    const goToPrevious = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const jumpToStep = (key) => {
        const index = steps.findIndex(step => step.key === key);
        if (index !== -1) {
            setCurrentStepIndex(index);
        }
    };

    return (
        <ScrollView contentContainerStyle={{flex: 1}}>
            <OnboardingHeader headerTitle={currentStep.title}/>

            <View style={{flex: 1}}>
                <CurrentComponent
                    updateFormData={updateFormData}
                    reportValidity={(isValid) =>
                        updatePageStatus(currentStep.key, { valid: isValid, visited: true })
                    }
                    markVisited={() => updatePageStatus(currentStep.key, { visited: true })}
                />
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                {currentStepIndex > 0 && (
                    <Button title="Back" onPress={goToPrevious}/>
                )}
                {currentStepIndex < steps.length - 1 && (
                    <Button title="Next" onPress={goToNext}/>
                )}
            </View>

            <View style={{ marginTop: 20 }}>
                {steps.map(step => (
                    <Button
                        key={step.key}
                        title={`Go to ${step.title}`}
                        onPress={() => jumpToStep(step.key)}
                    />
                ))}
            </View>

        </ScrollView>
    )
}

export default HostOnboarding;