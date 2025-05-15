import {Text, TextInput, View} from "react-native";
import {styles} from "../styles/RegisterStyles";
import React, {useState} from "react";
import TranslatedText from "../../../../features/translation/components/TranslatedText";

const EmailView = ({formData, handleDataChange, handleValidFormChange}) => {
    const [errorMessage, setErrorMessage] = useState('');

    const validateEmail = (email) => {
        if (!email) {
            handleValidFormChange('email', false);
            setErrorMessage("Email can't be empty.");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            handleValidFormChange('email', false);
            setErrorMessage("Does not follow the email format example@mail.com");
        } else {
            handleValidFormChange('email', true);
            setErrorMessage('');
        }
    }

  return(
      <View>
          <Text style={styles.label}>
              <TranslatedText textToTranslate={'Email'}/>:
          </Text>
          <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={value => {
                  validateEmail(value);
                  handleDataChange('email', value)
              }}
          />
          {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
          )}
      </View>
  )
}

export default EmailView;