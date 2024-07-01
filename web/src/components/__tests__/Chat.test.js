// Chat.test.js
import React from 'react';
import { render } from '@testing-library/react';
import Chat from '../chat/Chat';
import { BrowserRouter as Router } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';

// Mock aws-amplify configuration
Amplify.configure(awsExports);

// Mock withAuthenticator HOC
jest.mock('@aws-amplify/ui-react', () => ({
  withAuthenticator: (Component) => (props) => <Component {...props} />
}));

test('renders Chat component', () => {
  const { getByText } = render(
    <Router>
      <Chat user={{ attributes: { email: 'test@example.com' } }} />
    </Router>
  );


});
