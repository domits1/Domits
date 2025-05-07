import {Text, TextInput, View} from "react-native";
import {styles} from "../styles/RegisterStyles";
import React, {useState} from "react";

const PasswordView = ({formData, setFormData}) => {
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

        console.log(requirements.length)


        const metRequirements = Object.values(requirements).filter(Boolean).length;

        let strength = {text: 'Weak', color: 'red'};
        if (metRequirements === 4) {
            strength = {text: 'Very Strong', color: 'green'};
        } else if (metRequirements === 3) {
            strength = {text: 'Strong', color: '#088f08'};
        } else if (metRequirements === 2) {
            strength = {text: 'Weak', color: 'orange'};
        }

        setPasswordStrength({...strength, requirements});
    };

    const handleChangePassword = (name, value) => {
        setFormData(prevState => ({...prevState, [name]: value}));
        if (name === 'password') {
            checkPasswordStrength(value);
        }
    };

  return (
      <View>
          <Text style={styles.label}>Password:</Text>
          <TextInput
              style={[styles.input, {borderColor: passwordStrength.color}]}
              placeholder="Password"
              secureTextEntry
              value={formData.password}
              onChangeText={value => handleChangePassword('password', value)}
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