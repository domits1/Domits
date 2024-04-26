jest.mock('react-places-autocomplete', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: ({ children }) => {
            const props = {
                getInputProps: jest.fn(() => ({
                    placeholder: 'Search Places ....'
                })),
                suggestions: [],
                getSuggestionItemProps: jest.fn(),
                loading: false
            };
            return children(props);
        },
        geocodeByAddress: jest.fn().mockResolvedValue([{ formatted_address: '123 Test St' }]),
        getLatLng: jest.fn().mockResolvedValue({ lat: 1, lng: 1 })
    };
});

// Dit is een mock van google autocomplete om het sneller in te laden
global.google = {
    maps: {
        places: {
            AutocompleteService: jest.fn(),
            PlacesServiceStatus: {
                OK: 'OK'
            }
        },
        Geocoder: jest.fn()
    }
};

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchBar } from '../base/SearchBar';

describe('SearchBar Component', () => {
    test('laadt de autocomplete input', () => {
        render(<SearchBar />);
        const inputElement = screen.getByPlaceholderText('Search Places ....');
        expect(inputElement).toBeInTheDocument();
    });

    test('controleert de lege toestand van het adresveld', () => {
        render(<SearchBar />);
        const inputElement = screen.getByPlaceholderText('Search Places ....');
        expect(inputElement.value).toBe('');
    });
});