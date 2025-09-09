import {useTranslation} from "react-i18next";
import {useEffect, useState} from "react";
import {ScrollView, Text, TextInput, View} from "react-native";
import {styles} from "../styles/HostOnboardingStyles";
import TranslatedText from "../../translation/components/TranslatedText";

const onboardingDescription = ({formData, updateFormData, reportValidity, markVisited}) => {
  const MAX_DESCRIPTION_LENGTH = 500;

  const {t} = useTranslation();
  const [description, setDescription] = useState(formData.property.description);
  const [error, setError] = useState('');
  const [descriptionLength, setDescriptionLength] = useState(description.length);

  function isDescriptionValid(description) {
    const regex = /^[a-zA-Z0-9,.:+&!?*()\-\/'"\s]*$/;
    return regex.test(description);
  }

  useEffect(() => {
    markVisited(true);
  }, [])

  useEffect(() => {
    setDescriptionLength(description.length);

    if (description.trim() === '' || description.length < 20) {
      setError('A longer description is required.');
      reportValidity(false);
    } else if (!isDescriptionValid(description)) {
      setError('Special characters are not allowed.');
      reportValidity(false);
    } else {
      setError('');
      updateFormData((draft) => {
        draft.property.description = description;
      })
      reportValidity(true);
    }
  }, [description]);

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Provide a description"}/>:
          </Text>
          <Text style={styles.onboardingPageDescription}>
            <TranslatedText textToTranslate={"Share what makes your space special."}/>
          </Text>
          <View style={styles.inputContainerCenter}>
            <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t("Property Description")}
                style={styles.inputField}
                maxLength={MAX_DESCRIPTION_LENGTH}
                multiline={true}
            />
          </View>
          <Text style={styles.lengthTrackerText}>
            {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
          </Text>
          {error ?
              <Text style={styles.errorText}>
                <TranslatedText textToTranslate={error}/>
              </Text>
              : null
          }
        </View>
      </ScrollView>
  );
}

export default onboardingDescription;