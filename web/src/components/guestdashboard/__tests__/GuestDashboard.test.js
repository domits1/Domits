import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import GuestDashboard from './GuestDashboard';
import { API, Auth } from 'aws-amplify';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('aws-amplify', () => ({
  API: {
    graphql: jest.fn(),
  },
  Auth: {
    currentUserInfo: jest.fn(),
  },
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('../../images/icons/edit-05.png', () => 'edit-icon.png');

// Mock data
const mockUser = {
  attributes: {
    email: 'test@example.com',
    'custom:username': 'testuser',
    address: '123 Test Street',
    phone_number: '123-456-7890',
  },
};

const mockAccommodations = {
  data: {
    listAccommodations: {
      items: [],
    },
  },
};

describe('GuestDashboard', () => {
  beforeEach(() => {
    Auth.currentUserInfo.mockResolvedValue(mockUser);
    API.graphql.mockResolvedValue(mockAccommodations);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders personal information', async () => {
    render(
      <MemoryRouter>
        <GuestDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(Auth.currentUserInfo).toHaveBeenCalled());
    await waitFor(() => expect(API.graphql).toHaveBeenCalled());

    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Name:')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Address:')).toBeInTheDocument();
    expect(screen.getByText('123 Test Street')).toBeInTheDocument();
    expect(screen.getByText('Phone:')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    expect(screen.getByText('Family:')).toBeInTheDocument();
    expect(screen.getByText('2 adults - 2 kids')).toBeInTheDocument();
  });

  test('handles errors in fetching user data', async () => {
    Auth.currentUserInfo.mockRejectedValueOnce(new Error('Error fetching user data'));

    render(
      <MemoryRouter>
        <GuestDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(Auth.currentUserInfo).toHaveBeenCalled());

    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  test('handles errors in fetching accommodations', async () => {
    API.graphql.mockRejectedValueOnce(new Error('Error listing accommodations'));

    render(
      <MemoryRouter>
        <GuestDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(API.graphql).toHaveBeenCalled());
    await waitFor(() => expect(Auth.currentUserInfo).toHaveBeenCalled());

    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });
});
