import {Text, TextInput, View} from "react-native";
import {styles} from "../styles/RegisterStyles";
import React, {useState} from "react";
import TranslatedText from "../../../../features/translation/components/TranslatedText";

const PersonalDetailsView = ({formData, handleDataChange, handleValidFormChange}) => {
    const [errorFirstName, setErrorFirstName] = useState('');
    const [errorLastName, setErrorLastName] = useState('');

    const validateFirstName = (firstName) => {
        if (!firstName){
            handleValidFormChange('firstName', false);
            setErrorFirstName("First name can't be empty.");
        } else if (firstName.length < 2){
            handleValidFormChange('firstName', false);
            setErrorFirstName("First name must be at least 2 characters.");
        } else {
            handleValidFormChange('firstName', true);
            setErrorFirstName('');
        }
    }

    const validateLastName = (lastName) => {
        if (!lastName){
            handleValidFormChange('lastName', false);
            setErrorLastName("Last name can't be empty.");
        } else if (lastName.length < 2){
            handleValidFormChange('lastName', false);
            setErrorFirstName("Last name must be at least 2 characters.");
        } else {
            handleValidFormChange('lastName', true);
            setErrorLastName('');
        }
    }

  return(
      <View>
          <Text style={styles.label}>
              <TranslatedText textToTranslate={'First Name'}/>:
          </Text>
          <TextInput
              style={styles.input}
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={value => {
                  validateFirstName(value);
                  handleDataChange('firstName', value)
              }}
          />
          {errorFirstName && (
              <Text style={styles.errorText}>{errorFirstName}</Text>
          )}

          <Text style={styles.label}>
              <TranslatedText textToTranslate={'Last Name'}/>:
          </Text>
          <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={value => {
                  validateLastName(value);
                  handleDataChange('lastName', value)
              }}
          />
          {errorLastName && (
              <Text style={styles.errorText}>{errorLastName}</Text>
          )}
      </View>
  )
}

export default PersonalDetailsView;