import React, {useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';

const CODE_LENGTH = 6;

const ERROR_MESSAGES = {
  invalidCode: 'Invalid code. Please try again.',
  tooManyAttempts: 'Too many attempts. Please wait a moment and try again.',
  generic: 'Something went wrong. Please try again.',
};

const toDigits = value => value.replace(/\D/g, '').slice(0, CODE_LENGTH);

const MfaCodeView = ({isSubmitting, errorKey, onVerify, onBack}) => {
  const {t} = useTranslation();
  const [code, setCode] = useState('');
  const errorMessage = errorKey
    ? t(ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.generic)
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {t('Two-factor authentication')}
          </Text>
        </View>
        <Text style={styles.instruction}>
          {t('Enter the 6-digit code from your authenticator app.')}
        </Text>
        <TextInput
          placeholder={t('6-digit code')}
          placeholderTextColor="gray"
          value={code}
          onChangeText={value => setCode(toDigits(value))}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          editable={!isSubmitting}
          accessibilityLabel={t('6-digit code')}
        />
        {errorMessage ? (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}
        <View style={styles.buttonAlignment}>
          <Pressable
            onPress={() => onVerify(code)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityState={{disabled: isSubmitting, busy: isSubmitting}}
            style={({pressed}) => [
              styles.verifyButton,
              (pressed || isSubmitting) && styles.dimmedButton,
            ]}>
            <Text style={styles.verifyButtonText}>
              {isSubmitting ? t('Verifying...') : t('Verify')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onBack}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityState={{disabled: isSubmitting}}
            style={({pressed}) => [
              styles.backButton,
              (pressed || isSubmitting) && styles.dimmedButton,
            ]}>
            <Text style={styles.backButtonText}>{t('Back to login')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'stretch',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    paddingTop: 40,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  instruction: {
    fontSize: 16,
    color: 'black',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: 'green',
    color: 'black',
    borderWidth: 1,
    marginBottom: 12,
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
  },
  errorMessage: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonAlignment: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
  },
  verifyButton: {
    backgroundColor: '#0D9813',
    width: 140,
    height: 47,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#003366',
    width: 140,
    height: 47,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  dimmedButton: {
    opacity: 0.6,
  },
});

export default MfaCodeView;
