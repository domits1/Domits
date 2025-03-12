import {describe, expect, it, beforeEach} from '@jest/globals';
import SelectLanguagePopup from '../components/SelectLanguagePopup';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {LanguageReferences} from '../services/Languages';

describe('Select Language Popup', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: LanguageReferences,
    });
    let isVisible = true;
    const setIsVisible = visible => {
      isVisible = visible;
    };
    render(
      <SelectLanguagePopup isVisible={isVisible} setIsVisible={setIsVisible} />,
    );
  });

  it('should return the currently selected preferred language', async () => {
    expect(i18n.language).toEqual('en');
  });

  it('should show a checkmark at the currently selected preferred language', () => {
    expect(screen.getByTestId(`checkmark ${i18n.language}`)).toBeTruthy();
  });

  /**
   * Confirms checkmark at the English keyword is present.
   * Presses the 'Nederlands' language option.
   * Confirms checkmark at the English keyword is removed,
   * and checkmark the Nederlands keyword is present.
   */
  it('should select a different language', async () => {
    expect(screen.getByTestId(`checkmark en`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('Nederlands'));

    waitFor(() => {
      expect(screen.queryByTestId('checkmark en')).toBeNull();
      expect(screen.getByTestId('checkmark nl')).toBeTruthy();
    });
  });

  /**
   * Confirms the title text is 'Select a language'.
   * Presses the 'Nederlands' language option.
   * Confirms the title text is translated to the Dutch
   * translation ('Kies een taal').
   */
  it('should translate some text', async () => {
    const title = screen.getByTestId('title');
    const text = within(title).getByText('Select a language');
    expect(text).toBeTruthy();
    fireEvent.press(screen.getByTestId('Nederlands'));

    waitFor(() => {
      expect(within(title).getByText('Kies een taal')).toBeTruthy();
    });
  });
});
