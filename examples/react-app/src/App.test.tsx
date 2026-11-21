import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetForTests } from './api/settingsApi';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    resetForTests();
  });

  it('opens on Settings and switches pages from the main navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    await screen.findByLabelText('Display name');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('button', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(nav).getByRole('button', { name: 'Shifts' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Shifts' })).toBeInTheDocument();
    expect(screen.getByText('Ridge Loop drainage repair')).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: 'My hours' }));
    expect(screen.getByRole('heading', { level: 1, name: 'My hours' })).toBeInTheDocument();
  });
});
