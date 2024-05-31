import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom'; // Import BrowserRouter
import HostDashboard from "../hostdashboard/HostDashboard";
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('HostDashboard', () => {
    it('renders without crashing', () => {
        render(
            <Router> {/* Wrap your component inside Router */}
                <HostDashboard />
            </Router>
        );
    });

    it('renders welcome message with user name', () => {
        render(
            <Router>
                <HostDashboard />
            </Router>
        );
        const welcomeMsg = screen.getByText('Welcome');
        expect(welcomeMsg).toBeInTheDocument();
    });

});
