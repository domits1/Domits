import React from 'react';
import {render} from '@testing-library/react-native';
import ConfirmedView from '../views/ConfirmedView';
import {beforeEach, describe, expect, it} from '@jest/globals';
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {LanguageReferences} from "../../../translation/services/Languages";

describe('ConfirmedView Component', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: LanguageReferences,
    });
  })

  const mockUserAttributes = {
    given_name: 'John',
    family_name: 'Doe',
  };

  it('should render all text elements', () => {
    const {getByText} = render(
      <ConfirmedView userAttributes={mockUserAttributes} />,
    );

    expect(getByText('Payment confirmed!')).toBeTruthy();
    expect(getByText('Your payment has been confirmed.')).toBeTruthy();
    expect(getByText('[ J. Doe ]')).toBeTruthy();
  });

  it('should handle different user name formats', () => {
    const differentUserAttributes = {
      given_name: 'Jane',
      family_name: 'van Doe',
    };

    const {getByText} = render(
      <ConfirmedView userAttributes={differentUserAttributes} />,
    );

    expect(getByText('[ J. van Doe ]')).toBeTruthy();
  });
});
