import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../base/TestingFunction';

test('Renders Hello, World!', () => {
  render(<App />);
  const helloWorld = screen.getByText('Hello, World!');
  expect(helloWorld).toBeInTheDocument();
});