import React from 'react';
import { render, getByTestId  } from '@testing-library/react-native';
import { Messages } from '../src/screens/messages';

describe('Messages component', () => {
  const defaultRoute = { params: {} };
  
  test('renders back button when isChatVisible is true', () => {
    const route = { params: { email: 'test@example.com' } };
    const { getByText } = render(<Messages route={route} />);
    const backButton = getByText('Back to Users');
    expect(backButton).toBeTruthy();
  });

  test('renders chat container when isChatVisible is true', () => {
    const route = { params: { email: 'test@example.com' } };
    const { getByTestId } = render(<Messages route={route} />);
    const chatContainer = getByTestId('chat-container');
    expect(chatContainer).toBeTruthy();
  });

  test('renders back button when isChatVisible is true', () => {
    const route = { params: { email: 'test@example.com' } };
    const { getByText } = render(<Messages route={route} />);
    const backButton = getByText('Back to Users');
    expect(backButton).toBeTruthy();
  });

  test('renders send button', () => {
    const route = { params: { email: 'test@example.com' } };
    const { getByText } = render(<Messages route={route} />);
    const sendButton = getByText('Send');
    expect(sendButton).toBeTruthy();
  });

  test('renders message input', () => {
    const route = { params: { email: 'test@example.com' } };
    const { getByPlaceholderText } = render(<Messages route={route} />);
    const messageInput = getByPlaceholderText('Type your message...');
    expect(messageInput).toBeTruthy();
  });

  test('renders list of chat users when isChatVisible is false', () => {
    const { debug } = render(<Messages route={defaultRoute} />);
    debug(); // This will log the rendered component to the console
    const chatPeople = getByTestId('chat-people');
    expect(chatPeople).toBeTruthy();
  });
  

  // Add more tests as needed...
});
