import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Accommodations from '../Accommodations.js';
import '@testing-library/jest-dom/extend-expect';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      body: JSON.stringify([
        {
          Images: { image1: 'image_url' },
          Title: 'Test Title',
          City: 'Test City',
          Country: 'Test Country',
          Description: 'Test Description',
          Measurements: '50',
          Rent: '100',
          ID: '1',
          Bathrooms: '2',
          Bedrooms: '1',
          GuestAmount: '4',
        },
      ]),
    }),
  })
);

describe('Accommodations Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <Accommodations searchResults={[]} />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/loading/i)).toHaveLength(8);
  });

  test('renders accommodation cards after loading', async () => {
    render(
      <MemoryRouter>
        <Accommodations searchResults={[]} />
      </MemoryRouter>
    );

    // Wait for the fetch and loading state to be finished
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // Check if the accommodation data is rendered
    expect(screen.getByText('Test City, Test Country')).toBeInTheDocument();
    expect(screen.getByText('€100 per night')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('50m²')).toBeInTheDocument();
    expect(screen.getByText('2 Bathrooms')).toBeInTheDocument();
    expect(screen.getByText('1 Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('4 Persons')).toBeInTheDocument();
  });

  test('renders accommodation cards based on searchResults prop', () => {
    const searchResults = [
      {
        Images: { image1: 'image_url' },
        Title: 'Search Title',
        City: 'Search City',
        Country: 'Search Country',
        Description: 'Search Description',
        Measurements: '60',
        Rent: '200',
        ID: '2',
        Bathrooms: '3',
        Bedrooms: '2',
        GuestAmount: '5',
      },
    ];

    render(
      <MemoryRouter>
        <Accommodations searchResults={searchResults} />
      </MemoryRouter>
    );

    // Check if the accommodation data from searchResults is rendered
    expect(screen.getByText('Search City, Search Country')).toBeInTheDocument();
    expect(screen.getByText('€200 per night')).toBeInTheDocument();
    expect(screen.getByText('Search Description')).toBeInTheDocument();
    expect(screen.getByText('60m²')).toBeInTheDocument();
    expect(screen.getByText('3 Bathrooms')).toBeInTheDocument();
    expect(screen.getByText('2 Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('5 Persons')).toBeInTheDocument();
  });
});
