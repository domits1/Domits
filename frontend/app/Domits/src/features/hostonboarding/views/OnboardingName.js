import {Text, TextInput, View} from "react-native";
import {useEffect, useState} from "react";
import TranslatedText from "../../translation/components/TranslatedText";
import {styles} from "../styles/HostOnboardingStyles";
import {useTranslation} from "react-i18next";

const OnboardingName = ({formData, updateFormData, reportValidity, markVisited}) => {
  const {t} = useTranslation();
  const [title, setTitle] = useState(formData.property.title);
  const [error, setError] = useState('');

  function isTitleValid(title) {
    const regex = /^[a-zA-Z0-9,.:+&()\-\/'"\s]*$/;
    return regex.test(title);
  }

  useEffect(() => {
    markVisited(true);
    if (title.trim() === '') {
      setError('Title is required.');
      reportValidity(false);
    } else if (!isTitleValid(title)) {
      setError('Special characters are not allowed.');
      reportValidity(false);
    } else {
      setError('');
      updateFormData((draft) => {
        draft.property.title = title;
      })
      reportValidity(true);
    }
  }, [title]);

  return (
      <View style={styles.contentContainer}>
        <Text style={styles.onboardingPageTitle}>
          <TranslatedText textToTranslate={"Name your property"}/>:
        </Text>
        <Text style={styles.onboardingPageDescription}>
          <TranslatedText textToTranslate={"A short title works best. Don't worry, you can always change it later."}/>
        </Text>
        <View style={styles.inputContainerCenter}>
          <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("Property Title")}
              style={styles.inputField}
              maxLength={100}
          />
        </View>
        {error ?
            <Text style={styles.errorText}>
              <TranslatedText textToTranslate={error}/>
            </Text>
            : null
        }
      </View>
  );
}

export default OnboardingName;