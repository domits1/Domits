import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { LanguageContext } from '../../context/LanguageContext';

const openCalendar = () => {
    const view = render(
        <MemoryRouter>
            <LanguageContext.Provider value={{ language: 'en' }}>
                <SearchBar />
            </LanguageContext.Provider>
        </MemoryRouter>
    );
    fireEvent.focus(screen.getByRole('button', { name: 'Check in • out' }));
    return view;
};

describe('SearchBar date picker', () => {
    test('does not colour weekend days red, because every day shown can be booked', () => {
        const { container } = openCalendar();

        expect(container.querySelector('.Calendar__day')).not.toBeNull();
        expect(container.querySelector('.Calendar__day.-weekend')).toBeNull();
    });
});
