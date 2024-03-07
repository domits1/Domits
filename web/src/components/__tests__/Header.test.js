import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Header from '../base/Header';
import { BrowserRouter as Router } from 'react-router-dom';

describe('Header Component', () => {
    it('renders without crashing', () => {
        render(
            <Router>
                <Header />
            </Router>
        );
    });

    it('navigates to home page when logo is clicked', () => {
        const { getByAltText } = render(
            <Router>
                <Header />
            </Router>
        );
        fireEvent.click(getByAltText('Logo'));
        expect(window.location.pathname).toBe('/');
    });

    it('navigates to login page when profile button is clicked', () => {
        const { getByAltText } = render(
            <Router>
                <Header />
            </Router>
        );
        fireEvent.click(getByAltText('profile-icon.svg'));
        expect(window.location.pathname).toBe('/login');
    });

    it('navigates to landing page when "Become a host" button is clicked', () => {
        const { getByText } = render(
            <Router>
                <Header />
            </Router>
        );
        fireEvent.click(getByText('Become a host'));
        expect(window.location.pathname).toBe('/landing');
    });

    it('navigates to ninedots page when ninedots button is clicked', () => {
        const { getByAltText } = render(
            <Router>
                <Header />
            </Router>
        );
        fireEvent.click(getByAltText('dots-grid.svg'));
        expect(window.location.pathname).toBe('/travelinnovation');
    });

    // You can add more test cases to cover additional functionalities
});
