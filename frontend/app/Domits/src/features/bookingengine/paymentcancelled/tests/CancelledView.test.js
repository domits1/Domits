import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import CancelledView from '../views/CancelledView';
import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {LanguageReferences} from "../../../translation/services/Languages";

describe('CancelledView Component', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: LanguageReferences,
    });
  })

  it('should render all text elements correctly', () => {
    const mockOnPress = jest.fn();

    const {getByText} = render(<CancelledView onPress={mockOnPress} />);

    expect(getByText('Payment cancelled.')).toBeTruthy();
    expect(getByText('Something went wrong during payment.')).toBeTruthy();
    expect(getByText(/If you wish to cancel your booking, press/)).toBeTruthy();
    expect(getByText('Here')).toBeTruthy();
  });

  it('should call onPress prop when "Here" text is pressed', () => {
    const mockOnPress = jest.fn();

    const {getByText} = render(<CancelledView onPress={mockOnPress} />);

    const hereText = getByText('Here');
    fireEvent.press(hereText);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should render with default props', () => {
    const {getByText} = render(<CancelledView onPress={() => {}} />);

    expect(getByText('Payment cancelled.')).toBeTruthy();
  });

  it('should render with custom onPress handler', () => {
    const customOnPress = jest.fn();

    const {getByText} = render(<CancelledView onPress={customOnPress} />);

    const hereText = getByText('Here');
    fireEvent.press(hereText);

    expect(customOnPress).toHaveBeenCalledTimes(1);
  });
});
