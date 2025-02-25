import {describe, expect, it, beforeEach} from '@jest/globals';
import SelectLanguagePopup from '../components/SelectLanguagePopup';
import {render, screen} from '@testing-library/react-native';
import i18n from '../services/TranslatorInit';

describe('Select Language Popup', () => {
  describe('Checkmark', () => {
    beforeEach(() => {
      const initI18n = i18n;
      let isVisible = true;
      const setIsVisible = visible => {
        isVisible = visible;
      };
      render(
        <SelectLanguagePopup
          isVisible={isVisible}
          setIsVisible={setIsVisible}
        />,
      );
    });

    it('should show a checkmark', () => {
      expect(screen.getByTestId('checkmark')).toBeTruthy();
    });
  });
});
