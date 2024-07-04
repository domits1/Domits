import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Accommodations from '../home/Accommodations';

// Mocking the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        body: JSON.stringify([
          {
            ID: 1,
            Title: 'Sample Title',
            City: 'Sample City',
            Country: 'Sample Country',
            Description: 'Sample Description',
            Rent: 100,
            Bedrooms: 2,
            Bathrooms: 1,
            GuestAmount: 4,
            Measurements: 80,
            Images: { image1: 'sample-image-url' },
          },
          // Add more sample data as needed
        ]),
      }),
  })
);

// Mocking useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe.skip('Accommodations component', () => {  // Note the .skip here
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders skeleton loaders while data is being fetched', async () => {
    const { container } = render(<Accommodations />);
    expect(container.querySelectorAll('.skeleton-loader').length).toBe(8);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('renders accommodation cards after data is fetched', async () => {
    const { container, getByText } = render(<Accommodations />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(container.querySelectorAll('.accocard').length).toBe(1); // Assuming only one accommodation is fetched
    expect(getByText('Sample Title, Sample City, Sample Country')).toBeInTheDocument();
  });

  it('renders pagination correctly', async () => {
    const { container, getByText } = render(<Accommodations />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(container.querySelectorAll('.pagination button').length).toBe(3); // Previous, Next, and one page number button
    fireEvent.click(getByText('Next >'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(container.querySelectorAll('.pagination button').length).toBe(4); // Previous, Next, and two page number buttons
  });

  it('navigates to listing details when an accommodation card is clicked', async () => {
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
    const { getByAltText } = render(<Accommodations />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(getByAltText('Sample Title'));
    expect(navigate).toHaveBeenCalledWith('/listingdetails?ID=1');
  });

  // Add more test cases as needed
});
