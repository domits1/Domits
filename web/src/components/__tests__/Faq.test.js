import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Helpdesk from "../about/Helpdesk";
import Faq from '../landingpage/Faq';

test('shows search input and button', () => {
    render(<Helpdesk category="guest" />);
    screen.getByPlaceholderText(/What do you need help with?/i);
    screen.getByRole('button', {name: /Search/i });
  });

test('shows FAQ component', () => {
    render(<Helpdesk category='guest' />);
    screen.getByText(/FAQ - Frequently Asked Questions/i);
});

test('shows guest FAQ', () => {
    render(<Helpdesk category='guest' />);
    screen.getByText(/Is my information stored securely?/i);
    screen.getByText(/How much does Domits charge?/i);
    screen.getByText(/How to search and book?/i);
    screen.getByText(/How do I create and manage my account?/i);
});

test('shows host FAQ', () => {
    render(<Helpdesk category='host' />);
    screen.getByText(/How long will my listing stay active on your platform.../i);
    screen.getByText(/What steps are required to become a verified Domits host.../i);
    screen.getByText(/What kind of support and resources do you provide.../i);
    screen.getByText(/When can I expect payment after my guest's check-in.../i);
    screen.getByText(/How to see, change or cancel your reservations?/i);
});

test('clicking question shows answer', () => {
    render(<Faq category='guest' />);
    const question = screen.getByText(/Is my information stored securely?/i);
    fireEvent.click(question);
    screen.getByText(/Absolutely, we prioritize your privacy and security above all else.../i);
});