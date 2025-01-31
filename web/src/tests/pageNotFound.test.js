import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PageNotFound from "../../../../src/utils/error/404NotFound";
import { useNavigate } from 'react-router-dom';

jest.mock('aws-amplify');
jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
}));

describe('PageNotFound', () => {
    const navigate = jest.fn();
    beforeEach(() => {
        useNavigate.mockReturnValue(navigate);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render the main container with the correct class name', () => {
        const { container } = render(<PageNotFound />);
        expect(container.firstChild).toHaveClass('container-message');
    });

    it('should render sad face image with correct source and alt text', () => {
        const mockNavigate = jest.fn();
        jest.mock("react-router-dom", () => ({
            useNavigate: () => mockNavigate
        }));

        const { getByAltText } = render(<PageNotFound />);

        expect(getByAltText("sad")).toBeInTheDocument();
        expect(getByAltText("sad").src).toContain("sad.png");
    });

    it('should navigate to home page when button is clicked', () => {
        const { getByText } = render(<PageNotFound />);

        const button = getByText('Go back to home');
        fireEvent.click(button);

        expect(navigate).toHaveBeenCalledWith('/');
    });
})
