import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  // jsdom lacks these; the board, the ledger and the pilot lamps use them.
  const Observer = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  (global as any).ResizeObserver = Observer;
  (global as any).IntersectionObserver = Observer;
  (global as any).fetch = jest.fn(() => Promise.reject(new Error('offline')));
});

test('renders the switchboard with an idle board', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/CallCenterAI/i);
  expect(screen.getByLabelText(/incoming call/i)).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /board idle/i })).toBeInTheDocument();
});
