import React from 'react';
import {render} from '@testing-library/react-native';
import ConfirmedView from '../views/ConfirmedView';
import {describe, expect, it} from '@jest/globals';

describe('ConfirmedView Component', () => {
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
