import React from 'react';
import {render} from '@testing-library/react-native';
import LocationView from '../views/LocationView';
import {describe, expect, it} from '@jest/globals';

describe('LocationView Component', () => {
  const mockLocation = {
    street: 'Test Street',
    houseNumber: '123',
    houseNumberExtension: 'A',
  };

  const mockDescription =
    'This is a test property description that should be displayed.';

  it('should render location details', () => {
    const {getByText} = render(
      <LocationView location={mockLocation} description={mockDescription} />,
    );

    expect(getByText('Test Street 123 A')).toBeTruthy();
    expect(getByText(mockDescription)).toBeTruthy();
  });

  it('should limit description to 6 lines', () => {
    const {getByText} = render(
      <LocationView location={mockLocation} description={mockDescription} />,
    );

    const descriptionText = getByText(mockDescription);
    expect(descriptionText.props.numberOfLines).toBe(6);
  });

  it('should render without house number extension', () => {
    const minimalLocation = {
      street: 'Minimal Street',
      houseNumber: '1',
    };

    const {getByText} = render(
      <LocationView location={minimalLocation} description={mockDescription} />,
    );

    expect(getByText('Minimal Street 1')).toBeTruthy();
  });
});
