import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {LanguageReferences} from './Languages';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: LanguageReferences,
});
