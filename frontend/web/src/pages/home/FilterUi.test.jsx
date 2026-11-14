import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FilterUi from './FilterUi';
import { LanguageContext } from '../../context/LanguageContext';

const FILTER_RESPONSE = { properties: [{ id: 'property-1' }], lastEvaluatedKey: null };
const BOUNDS_RESPONSE = { priceRange: { min: 15, max: 10000 } };

const filterRequests = () => global.fetch.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('minPrice'));

const renderFilter = async (onFilterApplied = jest.fn()) => {
    render(
        <MemoryRouter>
            <LanguageContext.Provider value={{ language: 'en' }}>
                <FilterUi onFilterApplied={onFilterApplied} />
            </LanguageContext.Provider>
        </MemoryRouter>
    );
    const [minThumb, maxThumb] = screen.getAllByRole('slider');
    await waitFor(() => expect(maxThumb).toHaveAttribute('aria-valuenow', '10000'));
    return { onFilterApplied, minThumb, maxThumb };
};

describe('FilterUi price range', () => {
    beforeEach(() => {
        global.fetch = jest.fn((url) =>
            Promise.resolve({
                json: () => Promise.resolve(String(url).includes('minPrice') ? FILTER_RESPONSE : BOUNDS_RESPONSE),
            })
        );
    });

    afterEach(() => {
        delete global.fetch;
    });

    test('applies the new minimum as soon as the minimum slider is moved', async () => {
        const { onFilterApplied, minThumb } = await renderFilter();

        fireEvent.change(minThumb, { target: { value: 200 } });

        await waitFor(() => expect(onFilterApplied).toHaveBeenCalledTimes(1));
        expect(filterRequests()).toHaveLength(1);
        expect(filterRequests()[0]).toContain('minPrice=200');
        expect(filterRequests()[0]).toContain('maxPrice=10000');
        expect(onFilterApplied).toHaveBeenCalledWith(
            FILTER_RESPONSE.properties,
            null,
            expect.objectContaining({ minPrice: 200, maxPrice: 10000 })
        );
    });

    test('applies the new maximum as soon as the maximum slider is moved', async () => {
        const { onFilterApplied, maxThumb } = await renderFilter();

        fireEvent.change(maxThumb, { target: { value: 500 } });

        await waitFor(() => expect(onFilterApplied).toHaveBeenCalledTimes(1));
        expect(filterRequests()[0]).toContain('minPrice=15');
        expect(filterRequests()[0]).toContain('maxPrice=500');
    });

    test('still waits for Apply filter before applying the other filters', async () => {
        const { onFilterApplied } = await renderFilter();

        fireEvent.click(screen.getByLabelText('Wi-Fi'));
        fireEvent.click(screen.getByRole('button', { name: 'Increase Bedrooms' }));

        expect(filterRequests()).toHaveLength(0);
        expect(onFilterApplied).not.toHaveBeenCalled();
    });
});
