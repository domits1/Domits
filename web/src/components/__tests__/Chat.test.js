import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Chat from '../chat/Chat';
import { BrowserRouter as Router } from 'react-router-dom';
import { API, Auth } from 'aws-amplify';

jest.mock('aws-amplify', () => ({
    API: {
        graphql: jest.fn().mockImplementation(() => ({
            subscribe: jest.fn().mockImplementation(({ next }) => {
                const unsubscribe = jest.fn();
                next({ value: { data: { onCreateChat: { id: '1', text: 'Hello', email: 'test@example.com', createdAt: new Date().toISOString() } } } });
                return { unsubscribe };
            }),
        })),
    },
    Auth: {
        signOut: jest.fn(),
        signUp: jest.fn(),
    },
    graphqlOperation: jest.fn(),
}));

jest.mock('@aws-amplify/ui-react', () => ({
    withAuthenticator: (Component) => (props) => <Component {...props} />,
}));

// Mock data
const mockUser = {
    attributes: {
        email: 'test@example.com',
    },
};

const renderChat = () => {
    return render(
        <Router>
            <Chat user={mockUser} />
        </Router>
    );
};

test('renders Chat component without crashing', () => {
    renderChat();
    expect(screen.getByText('Messages')).toBeInTheDocument();
});

test('displays no conversations message when chatUsers is empty', () => {
    renderChat();
    expect(screen.getByText('You have no conversations yet. Initiate a conversation by viewing listings.')).toBeInTheDocument();
});

test('sends a message when Enter key is pressed', async () => {
    const { container } = renderChat();
    const input = container.querySelector('.chat__input');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    expect(input.value).toBe('Hello!');

    fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' });

    expect(API.graphql).toHaveBeenCalled();
});
