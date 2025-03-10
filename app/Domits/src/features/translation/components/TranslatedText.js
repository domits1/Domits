import {useTranslation} from 'react-i18next';
import {Text} from 'react-native';

const TranslatedText = ({textToTranslate}) => {
  const {t} = useTranslation();

  return <Text>{t(textToTranslate)}</Text>;
};

export default TranslatedText;
