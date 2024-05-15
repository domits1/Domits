import React from 'react';
import {render, fireEvent, screen} from '@testing-library/react';
import Pages from '../Pages';
import { useNavigate } from 'react-router-dom';

jest.mock('react-router-dom', ()=> ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(() => jest.fn()),
}));

describe('Pages component', () => {
    beforeEach(() => {
    useNavigate.mockClear();
    });

    it('navigates to /guestdashboard when Dashboard section is clicked', () => {
        render(<Pages/>)
        fireEvent.click(screen.getByText('Dashboard'));
        expect(useNavigate).toHaveBeenCalledWith('/guestdashboard');
    });
});