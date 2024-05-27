import { render, screen, fireEvent } from '@testing-library/react';
import Pages from '../Pages'; // Adjust the import to the actual path of your Pages component
import { useNavigate } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

describe('Pages component', () => {
    const mockNavigate = jest.fn();

    beforeEach(() => {
        useNavigate.mockReturnValue(mockNavigate);
        mockNavigate.mockClear();
    });

    it('navigates to /guestdashboard when Dashboard section is clicked', () => {
        render(<Pages />);
        fireEvent.click(screen.getByText('Dashboard'));
        expect(mockNavigate).toHaveBeenCalledWith('/guestdashboard');
    });
});
