import React, {useState} from 'react';
import {Text, TextInput, View, TouchableOpacity} from 'react-native';
import {styles} from '../styles/RegisterStyles';
import TranslatedText from '../../../../features/translation/components/TranslatedText';
import {useTranslation} from 'react-i18next';

const PasswordCreationStep = ({formData, handleDataChange, onBack, onSubmit}) => {
    const {t} = useTranslation();
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
    const [errors, setErrors] = useState({
        password: '',
        confirmPassword: ''
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
                break;
            case 3:
                strength = {text: 'Good', color: '#65cb29'};
                break;
            case 2:
                strength = {text: 'Weak', color: '#cea911'};
                break;
            case 1:
                strength = {text: 'Very Weak', color: '#f68122'};
                break;
            default:
                strength = {text: 'Very Weak', color: '#d31515'};
        }

        setPasswordStrength({...strength, requirements});
    };

    const validatePassword = (password) => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            specialChar: /[^A-Za-z0-9]/.test(password),
        };

        const allRequirementsMet = Object.values(requirements).every(Boolean);
        
        if (!password) {
            setErrors(prev => ({...prev, password: "Password can't be empty."}));
            return false;
        } else if (!allRequirementsMet) {
            setErrors(prev => ({...prev, password: "Password doesn't meet all requirements."}));
            return false;
        } else {
            setErrors(prev => ({...prev, password: ''}));
            return true;
        }
    };

    const validateConfirmPassword = (confirmPassword) => {
        if (!confirmPassword) {
            setErrors(prev => ({...prev, confirmPassword: "Please confirm your password."}));
            return false;
        } else if (confirmPassword !== formData.password) {
            setErrors(prev => ({...prev, confirmPassword: "Passwords don't match."}));
            return false;
        } else {
            setErrors(prev => ({...prev, confirmPassword: ''}));
            return true;
        }
    };

    const handlePasswordChange = (password) => {
        handleDataChange('password', password);
        checkPasswordStrength(password);
        validatePassword(password);
    };

    const handleConfirmPasswordChange = (confirmPassword) => {
        handleDataChange('confirmPassword', confirmPassword);
        validateConfirmPassword(confirmPassword);
    };

    const handleSubmit = () => {
        const isPasswordValid = validatePassword(formData.password);
        const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword);

        if (isPasswordValid && isConfirmPasswordValid) {
            onSubmit();
        }
    };

    return (
        <View>
            <Text style={styles.stepTitle}>
                <TranslatedText textToTranslate="Create Password"/>
            </Text>
            
            <Text style={styles.helperText}>
                <TranslatedText textToTranslate="Choose a strong password to secure your account"/>
            </Text>
            
            <Text style={styles.label}>
                <TranslatedText textToTranslate="Password"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    {borderColor: passwordStrength.color}, 
                    errors.password ? {borderColor: '#e53e3e'} : {},
                    formData.password ? styles.inputFocused : {}
                ]}
                placeholder={t('Enter your password')}
                placeholderTextColor="#a0aec0"
                secureTextEntry
                value={formData.password}
                onChangeText={handlePasswordChange}
            />
            {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
            )}

            <View style={styles.passwordRequirements}>
                <Text style={styles.requirementText}>
                    <TranslatedText textToTranslate={'Password Strength'}/>:{' '}
                    <Text style={{color: passwordStrength.color, fontWeight: '600'}}>
                        {passwordStrength.text}
                    </Text>
                </Text>
                <Text style={[styles.requirementText, {fontWeight: '600', marginTop: 8}]}>
                    <TranslatedText textToTranslate={'Requirements'}/>:
                </Text>
                <Text style={[styles.requirementText, {color: passwordStrength.requirements.length ? '#38a169' : '#e53e3e'}]}>
                    {passwordStrength.requirements.length ? '✓' : '✗'} {' '}
                    <TranslatedText textToTranslate={'At least 8 characters'}/>
                </Text>
                <Text style={[styles.requirementText, {color: passwordStrength.requirements.uppercase ? '#38a169' : '#e53e3e'}]}>
                    {passwordStrength.requirements.uppercase ? '✓' : '✗'} {' '}
                    <TranslatedText textToTranslate={'At least 1 uppercase letter'}/>
                </Text>
                <Text style={[styles.requirementText, {color: passwordStrength.requirements.number ? '#38a169' : '#e53e3e'}]}>
                    {passwordStrength.requirements.number ? '✓' : '✗'} {' '}
                    <TranslatedText textToTranslate={'At least 1 number'}/>
                </Text>
                <Text style={[styles.requirementText, {color: passwordStrength.requirements.specialChar ? '#38a169' : '#e53e3e'}]}>
                    {passwordStrength.requirements.specialChar ? '✓' : '✗'} {' '}
                    <TranslatedText textToTranslate={'At least 1 special character'}/>
                </Text>
            </View>

            <Text style={styles.label}>
                <TranslatedText textToTranslate="Confirm Password"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.confirmPassword ? {borderColor: '#e53e3e'} : {},
                    formData.confirmPassword ? styles.inputFocused : {}
                ]}
                placeholder={t('Confirm your password')}
                placeholderTextColor="#a0aec0"
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={handleConfirmPasswordChange}
            />
            {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>
                        <TranslatedText textToTranslate="Back"/>
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.signUpButton} onPress={handleSubmit}>
                    <Text style={styles.buttonText}>
                        <TranslatedText textToTranslate="Create Account"/>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default PasswordCreationStep;
