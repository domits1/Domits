import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {LanguageReferences} from '../../../features/translation/services/Languages';
import HomeScreen from '../screens/Home';

const mockFetchByCountry = jest.fn();

const mockCard = id => ({property: {id}});

jest.mock('../../../services/property/propertyRepository', () =>
  jest.fn().mockImplementation(() => ({
    fetchAllPropertyTypes: jest
      .fn()
      .mockResolvedValue({properties: [], lastEvaluatedKey: null}),
    fetchPropertyByCountry: (...args) => mockFetchByCountry(...args),
  })),
);

jest.mock('../../../services/wishlist/GetWishlist', () =>
  jest.fn().mockResolvedValue([]),
);
jest.mock('../../../services/wishlist/AddToWishlist', () => jest.fn());
jest.mock('../../../services/wishlist/RemoveFromWishlist', () => jest.fn());
jest.mock('../../../header/homeTopBarTabs', () => () => null);
jest.mock('../../loadingscreen/screens/LoadingScreen', () => () => null);
jest.mock('../../../components/ToastMessage', () => jest.fn());
jest.mock(
  '../../../features/translation/components/TranslatedText',
  () => () => null,
);
jest.mock('../views/PropertyCard', () => {
  const {Text: MockText} = require('react-native');
  return ({property}) => (
    <MockText testID={`card-${property.property.id}`}>
      {property.property.id}
    </MockText>
  );
});

const search = async country => {
  fireEvent.changeText(screen.getByTestId('SearchBar'), country);
  await act(async () => {
    fireEvent.press(screen.getByTestId('SearchButton'));
  });
};

describe('Home country search', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: LanguageReferences,
    });
    mockFetchByCountry.mockReset();
    mockFetchByCountry.mockImplementation(async country =>
      country === 'Spain'
        ? {
            properties: [mockCard('spain-1'), mockCard('spain-2')],
            lastEvaluatedKey: {createdAt: 111, id: 'spain-2'},
          }
        : {
            properties: [mockCard('france-1')],
            lastEvaluatedKey: {createdAt: 222, id: 'france-1'},
          },
    );
  });

  it('shows only the second country and sends no cursor after a new search', async () => {
    render(<HomeScreen />);
    await act(async () => {});

    await search('Spain');
    await waitFor(() =>
      expect(screen.getByTestId('card-spain-2')).toBeTruthy(),
    );

    await search('France');
    await waitFor(() =>
      expect(screen.getByTestId('card-france-1')).toBeTruthy(),
    );

    expect(screen.queryByTestId('card-spain-1')).toBeNull();
    expect(screen.queryByTestId('card-spain-2')).toBeNull();
    expect(mockFetchByCountry).toHaveBeenNthCalledWith(1, 'Spain', null, null);
    expect(mockFetchByCountry).toHaveBeenNthCalledWith(2, 'France', null, null);
  });
});
