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

    it('navigates to login page when profile button is clicked', () => {
        const { getByAltText } = render(
            <Router>
                <Header />
            </Router>
        );
        fireEvent.click(getByAltText('profile-icon.svg'));
        // Assert navigation behavior here
    });

    it('navigates to landing page when "Become a host" button is clicked', () => {
        const { getByText } = render(
            <Router>
                <Header />
            </Router>
        );
        fireEvent.click(getByText('Become a host'));
        // Assert navigation behavior here
    });

    it('navigates to ninedots page when ninedots button is clicked', () => {
        const { getByAltText } = render(
            <Router>
                <Header />
            </Router>
        );
        fireEvent.click(getByAltText('dots-grid.svg'));
        // Assert navigation behavior here
    });

    // You can add more test cases to cover additional functionalities
});
