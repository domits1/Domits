import React, {useState} from 'react';
import {Text, TextInput, View, TouchableOpacity, Platform, Alert} from 'react-native';
import {styles} from '../styles/RegisterStyles';
import TranslatedText from '../../../../features/translation/components/TranslatedText';
import {useTranslation} from 'react-i18next';

const PersonalDetailsStep = ({formData, handleDataChange, onNext}) => {
    const {t} = useTranslation();
    const [errors, setErrors] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: ''
    });




    const validateFullName = (fullName) => {
        if (!fullName) {
            setErrors(prev => ({...prev, fullName: "Full name can't be empty."}));
            return false;
        } else if (fullName.length < 2) {
            setErrors(prev => ({...prev, fullName: "Full name must be at least 2 characters."}));
            return false;
        } else {
            setErrors(prev => ({...prev, fullName: ''}));
            return true;
        }
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setErrors(prev => ({...prev, email: "Email can't be empty."}));
            return false;
        } else if (!emailRegex.test(email)) {
            setErrors(prev => ({...prev, email: "Please enter a valid email address."}));
            return false;
        } else {
            setErrors(prev => ({...prev, email: ''}));
            return true;
        }
    };

    const validatePhoneNumber = (phoneNumber) => {
        const phoneRegex = /^\+[0-9\s\-\(\)]{7,}$/;
        if (!phoneNumber) {
            setErrors(prev => ({...prev, phoneNumber: "Phone number can't be empty."}));
            return false;
        } else if (!phoneRegex.test(phoneNumber)) {
            setErrors(prev => ({...prev, phoneNumber: "Please enter a valid phone number starting with +."}));
            return false;
        } else {
            setErrors(prev => ({...prev, phoneNumber: ''}));
            return true;
        }
    };

    const handlePhoneNumberChange = (value) => {
        // Ensure it starts with + and only allow numbers, spaces, hyphens, and parentheses after that
        let cleanedValue = value.replace(/[^0-9\s\-\(\)+]/g, '');
        
        // Ensure it starts with +
        if (!cleanedValue.startsWith('+')) {
            cleanedValue = '+' + cleanedValue.replace(/^\+/, '');
        }
        
        handleDataChange('phoneNumber', cleanedValue);
        validatePhoneNumber(cleanedValue);
    };

    const validateDateOfBirth = (dateOfBirth) => {
        if (!dateOfBirth) {
            setErrors(prev => ({...prev, dateOfBirth: "Date of birth can't be empty."}));
            return false;
        } else if (dateOfBirth.length < 10) {
            setErrors(prev => ({...prev, dateOfBirth: "Please enter a complete date (DD/MM/YYYY)."}));
            return false;
        } else {
            // Parse DD/MM/YYYY format
            const [day, month, year] = dateOfBirth.split('/').map(Number);
            const birthDate = new Date(year, month - 1, day);
            const today = new Date();
            
            // Check if date is valid
            if (isNaN(birthDate.getTime()) || birthDate > today) {
                setErrors(prev => ({...prev, dateOfBirth: "Please enter a valid date."}));
                return false;
            }
            
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            if (age < 18) {
                setErrors(prev => ({...prev, dateOfBirth: "You must be at least 18 years old."}));
                return false;
            } else {
                setErrors(prev => ({...prev, dateOfBirth: ''}));
                return true;
            }
        }
    };

    const formatDateInput = (value) => {
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '');
        
        // Format as DD/MM/YYYY
        if (numbers.length <= 2) {
            return numbers;
        } else if (numbers.length <= 4) {
            return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
        } else {
            return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
        }
    };

    const handleDateChange = (value) => {
        const formattedValue = formatDateInput(value);
        handleDataChange('dateOfBirth', formattedValue);
        validateDateOfBirth(formattedValue);
    };

    const handleNext = () => {
        const isFullNameValid = validateFullName(formData.fullName);
        const isEmailValid = validateEmail(formData.email);
        const isPhoneValid = validatePhoneNumber(formData.phoneNumber);
        const isDateValid = validateDateOfBirth(formData.dateOfBirth);

        if (isFullNameValid && isEmailValid && isPhoneValid && isDateValid) {
            onNext();
        }
    };

    return (
        <View>
            <Text style={styles.stepTitle}>
                <TranslatedText textToTranslate="Personal Details"/>
            </Text>
            
            <Text style={styles.helperText}>
                <TranslatedText textToTranslate="Let's start with your basic information"/>
            </Text>
            
            <Text style={styles.label}>
                <TranslatedText textToTranslate="Full Name"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.fullName ? {borderColor: '#e53e3e'} : {},
                    formData.fullName ? styles.inputFocused : {}
                ]}
                placeholder={t("Enter your full name")}
                placeholderTextColor="#a0aec0"
                value={formData.fullName}
                onChangeText={value => {
                    handleDataChange('fullName', value);
                    validateFullName(value);
                }}
            />
            {errors.fullName && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
            )}

            <Text style={styles.label}>
                <TranslatedText textToTranslate="Email Address"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.email ? {borderColor: '#e53e3e'} : {},
                    formData.email ? styles.inputFocused : {}
                ]}
                placeholder={t("Enter your email address")}
                placeholderTextColor="#a0aec0"
                value={formData.email}
                onChangeText={value => {
                    handleDataChange('email', value);
                    validateEmail(value);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
            )}

            <Text style={styles.label}>
                <TranslatedText textToTranslate="Phone Number"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.phoneNumber ? {borderColor: '#e53e3e'} : {},
                    formData.phoneNumber ? styles.inputFocused : {}
                ]}
                placeholder={t("+31 06 12345678")}
                placeholderTextColor="#a0aec0"
                value={formData.phoneNumber}
                onChangeText={handlePhoneNumberChange}
                keyboardType="phone-pad"
            />
            {errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            )}

            <Text style={styles.label}>
                <TranslatedText textToTranslate="Date of Birth"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.dateOfBirth ? {borderColor: '#e53e3e'} : {},
                    formData.dateOfBirth ? styles.inputFocused : {}
                ]}
                placeholder={t("DD/MM/YYYY")}
                placeholderTextColor="#a0aec0"
                value={formData.dateOfBirth}
                onChangeText={handleDateChange}
                keyboardType="numeric"
                maxLength={10}
            />
            {errors.dateOfBirth && (
                <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
            )}

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.buttonText}>
                    <TranslatedText textToTranslate="Continue"/>
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default PersonalDetailsStep;
