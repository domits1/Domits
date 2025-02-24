import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

const resources = {
  en: require('../store/en.json'),
  nl: require('../store/nl.json'),
};

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: resources,
});
