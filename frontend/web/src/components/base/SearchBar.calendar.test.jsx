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

    test('lists the weekdays from Monday to Sunday', () => {
        const { container } = openCalendar();

        const weekdays = [...container.querySelectorAll('.Calendar__weekDay')].map((day) => day.getAttribute('title'));

        expect(weekdays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    });

    describe('in November 2026, where the 1st is a Sunday and the 2nd a Monday', () => {
        beforeEach(() => {
            jest.useFakeTimers({ now: new Date(2026, 10, 9, 12) });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        const columnOfDay = (container, dayOfMonth) => {
            const cell = [...container.querySelectorAll('.Calendar__day')].find(
                (day) => day.textContent === String(dayOfMonth) && day.getAttribute('aria-label').includes('November 2026')
            );
            return [...cell.parentElement.children].indexOf(cell);
        };

        test('puts Mondays in the first column and Sundays in the last', () => {
            const { container } = openCalendar();

            expect(columnOfDay(container, 2)).toBe(0);
            expect(columnOfDay(container, 9)).toBe(0);
            expect(columnOfDay(container, 1)).toBe(6);
            expect(columnOfDay(container, 15)).toBe(6);
        });
    });
});
