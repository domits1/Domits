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
import { BrowserRouter } from 'react-router-dom'; 
import { SearchBar } from '../base/SearchBar';

describe.skip('SearchBar Component', () => {
    test('laadt de autocomplete input', () => {
        render(
            <BrowserRouter> 
                <SearchBar />
            </BrowserRouter>
        );
        const inputElement = screen.getByPlaceholderText('Search Places ....');
        expect(inputElement).toBeInTheDocument();
    });

    test.skip('controleert de lege toestand van het adresveld', () => {
        render(
            <BrowserRouter> 
                <SearchBar />
            </BrowserRouter>
        );
        const inputElement = screen.getByPlaceholderText('Search Places ....'); 
        expect(inputElement.value).toBe('');
    });
});
