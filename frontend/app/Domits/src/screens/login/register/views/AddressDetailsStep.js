import React, {useState} from 'react';
import {Text, TextInput, View, TouchableOpacity} from 'react-native';
import {styles} from '../styles/RegisterStyles';
import TranslatedText from '../../../../features/translation/components/TranslatedText';
import {useTranslation} from 'react-i18next';

const AddressDetailsStep = ({formData, handleDataChange, onNext, onBack}) => {
    const {t} = useTranslation();
    const [errors, setErrors] = useState({
        address: '',
        postcode: '',
        country: ''
    });

    const validateAddress = (address) => {
        if (!address) {
            setErrors(prev => ({...prev, address: "Address can't be empty."}));
            return false;
        } else if (address.length < 5) {
            setErrors(prev => ({...prev, address: "Please enter a complete address."}));
            return false;
        } else {
            setErrors(prev => ({...prev, address: ''}));
            return true;
        }
    };

    const validatePostcode = (postcode) => {
        if (!postcode) {
            setErrors(prev => ({...prev, postcode: "Postcode can't be empty."}));
            return false;
        } else if (postcode.length < 4) {
            setErrors(prev => ({...prev, postcode: "Please enter a valid postcode."}));
            return false;
        } else {
            setErrors(prev => ({...prev, postcode: ''}));
            return true;
        }
    };

    const validateCountry = (country) => {
        if (!country) {
            setErrors(prev => ({...prev, country: "Country can't be empty."}));
            return false;
        } else if (country.length < 2) {
            setErrors(prev => ({...prev, country: "Please enter a valid country."}));
            return false;
        } else {
            setErrors(prev => ({...prev, country: ''}));
            return true;
        }
    };

    const handleNext = () => {
        const isAddressValid = validateAddress(formData.address);
        const isPostcodeValid = validatePostcode(formData.postcode);
        const isCountryValid = validateCountry(formData.country);

        if (isAddressValid && isPostcodeValid && isCountryValid) {
            onNext();
        }
    };

    return (
        <View>
            <Text style={styles.stepTitle}>
                <TranslatedText textToTranslate="Address Details"/>
            </Text>
            
            <Text style={styles.helperText}>
                <TranslatedText textToTranslate="Where are you located?"/>
            </Text>
            
            <Text style={styles.label}>
                <TranslatedText textToTranslate="Street Address"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.address ? {borderColor: '#e53e3e'} : {},
                    formData.address ? styles.inputFocused : {}
                ]}
                placeholder={t("Enter your street address")}
                placeholderTextColor="#a0aec0"
                value={formData.address}
                onChangeText={value => {
                    handleDataChange('address', value);
                    validateAddress(value);
                }}
                multiline
                numberOfLines={2}
            />
            {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
            )}

            <Text style={styles.label}>
                <TranslatedText textToTranslate="Postal Code"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.postcode ? {borderColor: '#e53e3e'} : {},
                    formData.postcode ? styles.inputFocused : {}
                ]}
                placeholder={t("Enter your postal code")}
                placeholderTextColor="#a0aec0"
                value={formData.postcode}
                onChangeText={value => {
                    handleDataChange('postcode', value);
                    validatePostcode(value);
                }}
            />
            {errors.postcode && (
                <Text style={styles.errorText}>{errors.postcode}</Text>
            )}

            <Text style={styles.label}>
                <TranslatedText textToTranslate="Country"/>
            </Text>
            <TextInput
                style={[
                    styles.input, 
                    errors.country ? {borderColor: '#e53e3e'} : {},
                    formData.country ? styles.inputFocused : {}
                ]}
                placeholder={t("Enter your country")}
                placeholderTextColor="#a0aec0"
                value={formData.country}
                onChangeText={value => {
                    handleDataChange('country', value);
                    validateCountry(value);
                }}
            />
            {errors.country && (
                <Text style={styles.errorText}>{errors.country}</Text>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>
                        <TranslatedText textToTranslate="Back"/>
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.buttonText}>
                        <TranslatedText textToTranslate="Continue"/>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default AddressDetailsStep;
