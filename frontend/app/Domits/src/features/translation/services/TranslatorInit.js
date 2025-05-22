import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {LanguageReferences} from './Languages';
import {NativeModules} from 'react-native';

const {EncryptedSharedPreferences} = NativeModules;

async function InitializeI18n() {
  try {
    const preferredLanguage = await EncryptedSharedPreferences.getItem(
      'i18nPreferredLanguage',
    );
    await i18n.use(initReactI18next).init({
      lng: preferredLanguage || 'en',
      fallbackLng: 'en',
      resources: LanguageReferences,
    });
  } catch (e) {
    console.error(e);
  }
}

export default InitializeI18n;
