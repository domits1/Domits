import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {LanguageInfo} from '../services/Languages';
import {useTranslation} from 'react-i18next';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {NativeModules} from 'react-native';
import React, {useState} from 'react';
import TranslatedText from './TranslatedText';

const {EncryptedSharedPreferences} = NativeModules;

const SelectLanguagePopup = ({isVisible, setIsVisible}) => {
  const {i18n} = useTranslation();
  const languages = LanguageInfo;
  const [loading, setLoading] = useState(false);

  return (
    <Modal
      animationType={'none'}
      transparent={true}
      visible={isVisible}
      onRequestClose={() => setIsVisible(!isVisible)}>
      {loading ? (
        <View style={style.overlay}>
          <View style={style.loaderContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        </View>
      ) : (
        <Pressable
          style={style.overlay}
          onPress={() => setIsVisible(!isVisible)}>
          <View style={style.modal}>
            <View style={style.header}>
              <Text style={style.title} testID={'title'}>
                <TranslatedText textToTranslate={'select a language'} />
              </Text>
              <TouchableOpacity
                style={style.closeButton}
                onPress={() => setIsVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {languages.map((language, index) => (
              <TouchableOpacity
                key={language.code}
                onPress={async () => {
                  setLoading(true);
                  await EncryptedSharedPreferences.setItem(
                    'i18nPreferredLanguage',
                    language.code,
                  );
                  await i18n.changeLanguage(language.code);
                  setLoading(false);
                  setIsVisible(!isVisible);
                }}>
                <View style={style.languageItemRow}>
                  {language.code == i18n.language ? (
                    <MaterialIcons
                      name={'check'}
                      size={13}
                      color={'green'}
                      testID={`checkmark ${language.code}`}
                    />
                  ) : null}
                  <Text testID={language.name}>{language.name}</Text>
                </View>
                {index < languages.length - 1 && (
                  <View style={style.separator} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}
    </Modal>
  );
};

const style = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modal: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  languageButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },

  languageItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  languageText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 10,
  },
});

export default SelectLanguagePopup;
