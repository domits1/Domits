import {Text, TextInput, View} from "react-native";
import {styles} from "../styles/RegisterStyles";
import React, {useState} from "react";

const PasswordView = ({formData, setFormData, handleValidFormChange}) => {
    const [passwordStrength, setPasswordStrength] = useState({
        text: 'Weak',
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
                strength = {text: 'Very Strong', color: '#009b00'};
                handleValidFormChange('password', true);
                break;
            case 3:
                strength = {text: 'Strong', color: '#65cb29'};
                handleValidFormChange('password', false);
                break;
            case 2:
                strength = {text: 'Weak', color: '#cea911'};
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
          <Text style={styles.label}>Password:</Text>
          <TextInput
              style={[styles.input, {borderColor: passwordStrength.color}]}
              placeholder="Password"
              secureTextEntry
              value={formData.password}
              onChangeText={value => handleChangePassword(value)}
          />
          <View style={styles.passwordRequirements}>
              <Text>
                  Password Strength:{' '}
                  <Text style={{color: passwordStrength.color}}>
                      {passwordStrength.text}
                  </Text>
              </Text>
              <Text>Requirements:</Text>
              <Text>
                  {passwordStrength.requirements.length ? '✔' : '✘'} At least 8
                  characters
              </Text>
              <Text>
                  {passwordStrength.requirements.uppercase ? '✔' : '✘'} One
                  uppercase letter
              </Text>
              <Text>
                  {passwordStrength.requirements.number ? '✔' : '✘'} One number
              </Text>
              <Text>
                  {passwordStrength.requirements.specialChar ? '✔' : '✘'} One
                  special character
              </Text>
          </View>
      </View>
  )
}

export default PasswordView;