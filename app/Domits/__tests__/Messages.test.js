// Messages.test.js
import React from 'react';
import { Messages } from '../src/screens/messages'
import * as mutations from "../src/screens/mutations";



// Sample data for mocks
const mockClient = {
  graphql: jest.fn(),
};

generateClient.mockReturnValue(mockClient);

describe('Messages component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the user list', async () => {
    const { getByText } = render(<Messages />);

    await waitFor(() => {
      expect(getByText('user1@example.com')).toBeTruthy();
      expect(getByText('user2@example.com')).toBeTruthy();
      expect(getByText('user3@example.com')).toBeTruthy();
    });
  });

  it('shows chat when a user is clicked', async () => {
    const { getByText, getByPlaceholderText } = render(<Messages />);

    fireEvent.press(getByText('user1@example.com'));

    await waitFor(() => {
      expect(getByText('Back to Users')).toBeTruthy();
      expect(getByPlaceholderText('Type your message...')).toBeTruthy();
    });
  });

  it('sends a message when send button is pressed', async () => {
    mockClient.graphql.mockResolvedValue({
      data: {
        createChat: {
          id: '1',
          text: 'Hello',
          email: 'jedar54396@acuxi.com',
          recipientEmail: 'user1@example.com',
        },
      },
    });

    const { getByText, getByPlaceholderText } = render(<Messages />);

    fireEvent.press(getByText('user1@example.com'));

    await waitFor(() => {
      expect(getByText('Back to Users')).toBeTruthy();
    });

    const messageInput = getByPlaceholderText('Type your message...');
    fireEvent.changeText(messageInput, 'Hello');
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(mockClient.graphql).toHaveBeenCalledWith(expect.objectContaining({
        query: mutations.createChat,
        variables: expect.objectContaining({
          input: expect.objectContaining({
            text: 'Hello',
            email: 'jedar54396@acuxi.com',
            recipientEmail: 'user1@example.com',
          }),
        }),
      }));
    });
  });
});
