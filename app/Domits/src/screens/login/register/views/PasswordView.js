import {Text, TextInput, View} from "react-native";
import {styles} from "../styles/RegisterStyles";
import React, {useState} from "react";
import TranslatedText from "../../../../features/translation/components/TranslatedText";
import {useTranslation} from 'react-i18next';

const PasswordView = ({formData, setFormData, handleValidFormChange}) => {
    const { t } = useTranslation();
    const [passwordStrength, setPasswordStrength] = useState({
        text: 'Very Weak',
        color: 'red',
        requirements: {
            length: false,
            uppercase: false,
            number: false,
            specialChar: false,
        },
    });

    const checkPasswordStrength = password => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            specialChar: /[^A-Za-z0-9]/.test(password),
        };

        const metRequirements = Object.values(requirements).filter(Boolean).length;

        let strength;
        switch (metRequirements) {
            case 4:
                strength = {text: 'Strong', color: '#009b00'};
                handleValidFormChange('password', true);
                break;
            case 3:
                strength = {text: 'Good', color: '#65cb29'};
                handleValidFormChange('password', false);
                break;
            case 2:
                strength = {text: 'Weak', color: '#cea911'};
                handleValidFormChange('password', false);
                break;
            case 1:
                strength = {text: 'Very Weak', color: '#f68122'};
                handleValidFormChange('password', false);
                break;
            default:
                strength = {text: 'Very Weak', color: '#d31515'};
                handleValidFormChange('password', false);
        }

        setPasswordStrength({...strength, requirements});
    };

    const handleChangePassword = (password) => {
        setFormData(prevState => ({...prevState, ['password']: password}));
            checkPasswordStrength(password);
    };

  return (
      <View>
          <Text style={styles.label}>
              <TranslatedText textToTranslate={'Password'}/>:
          </Text>
          <TextInput
              style={[styles.input, {borderColor: passwordStrength.color}]}
              placeholder={t('Password')}
              secureTextEntry
              value={formData.password}
              onChangeText={value => handleChangePassword(value)}
          />
          <View style={styles.passwordRequirements}>
              <Text>
                  <TranslatedText textToTranslate={'Password Strength'}/>:{' '}
                  <Text testID={'password-strength'} style={{color: passwordStrength.color}}>
                      {passwordStrength.text}
                  </Text>
              </Text>
              <Text>
                  <TranslatedText textToTranslate={'Requirements'}/>:
              </Text>
              <Text testID={'requirement-length'}>
                  {passwordStrength.requirements.length ? '✔' : '✘'}
                  <TranslatedText textToTranslate={'At least 8 characters'}/>
              </Text>
              <Text testID={'requirement-uppercase'}>
                  {passwordStrength.requirements.uppercase ? '✔' : '✘'}
                  <TranslatedText textToTranslate={'At least 1 uppercase letter'}/>
              </Text>
              <Text testID={'requirement-number'}>
                  {passwordStrength.requirements.number ? '✔' : '✘'}
                  <TranslatedText textToTranslate={'At least 1 number'}/>
              </Text>
              <Text testID={'requirement-special-character'}>
                  {passwordStrength.requirements.specialChar ? '✔' : '✘'}
                  <TranslatedText textToTranslate={'At least 1 special character'}/>
              </Text>
          </View>
      </View>
  )
}

export default PasswordView;