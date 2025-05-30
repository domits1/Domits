import React from 'react';
import {render} from '@testing-library/react-native';
import PricingView from './PricingView';
import {beforeEach, describe, expect, it} from '@jest/globals';
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {LanguageReferences} from "../../../translation/services/Languages"; // Adjust the import path as needed

describe('PricingView Component', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: LanguageReferences,
    });
  })

  const mockPricing = {
    roomRate: 100,
    cleaning: 50,
    service: 15,
  };

  it('should render price details with correct guest and night information', () => {
    const {getByText} = render(
      <PricingView guests={2} nights={3} pricing={mockPricing} />,
    );

    expect(getByText('2 Guest(s) | 3 Nights')).toBeTruthy();
  });

  it('should display pricing calculations', () => {
    const {getByText} = render(
      <PricingView guests={2} nights={3} pricing={mockPricing} />,
    );

    // Room rate
    expect(getByText('$100 per night x 3')).toBeTruthy();
    expect(getByText('$300')).toBeTruthy();

    // Cleaning fee
    expect(getByText('Cleaning fee')).toBeTruthy();
    expect(getByText('$50')).toBeTruthy();

    // Service fee
    expect(getByText('Domits service fee')).toBeTruthy();
    expect(getByText('$15')).toBeTruthy();
  });

  it('should calculate and display total price', () => {
    const {getByText} = render(
      <PricingView guests={2} nights={3} pricing={mockPricing} />,
    );

    const expectedTotal =
      mockPricing.roomRate * 3 + mockPricing.cleaning + mockPricing.service;

    expect(getByText(`$${expectedTotal}`)).toBeTruthy();
  });

  it('should render correctly with different input values', () => {
    const differentPricing = {
      roomRate: 150,
      cleaning: 75,
      service: 40,
    };

    const {getByText} = render(
      <PricingView guests={4} nights={5} pricing={differentPricing} />,
    );

    expect(getByText('4 Guest(s) | 5 Nights')).toBeTruthy();
    expect(getByText('$150 per night x 5')).toBeTruthy();

    // Room rate * 5
    expect(getByText('$750')).toBeTruthy();

    // Cleaning fee
    expect(getByText('$75')).toBeTruthy();

    // Service fee
    expect(getByText('$40')).toBeTruthy();
  });
});
