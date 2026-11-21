import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAccount, exportData, loadSettings, resetForTests } from '../api/settingsApi';
import { SettingsPage } from './SettingsPage';

// Keep the real in-memory API, but record calls to the account actions.
vi.mock('../api/settingsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/settingsApi')>();
  return {
    ...actual,
    exportData: vi.fn(actual.exportData),
    deleteAccount: vi.fn(actual.deleteAccount),
  };
});

async function renderLoadedPage() {
  const user = userEvent.setup();
  render(<SettingsPage />);
  await screen.findByLabelText('Display name');
  return { user };
}

function saveButton() {
  return screen.getByRole('button', { name: 'Save changes' });
}

/** Replaces URL.createObjectURL/revokeObjectURL, which jsdom does not provide. */
function stubObjectUrls() {
  const originals = {
    createObjectURL: Object.getOwnPropertyDescriptor(URL, 'createObjectURL'),
    revokeObjectURL: Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL'),
  };
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:switchback-export');
  const revokeObjectURL = vi.fn((_url: string) => {});
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });

  const restore = () => {
    for (const key of ['createObjectURL', 'revokeObjectURL'] as const) {
      const descriptor = originals[key];
      if (descriptor) Object.defineProperty(URL, key, descriptor);
      else Reflect.deleteProperty(URL, key);
    }
  };

  return { createObjectURL, restore };
}

describe('SettingsPage', () => {
  beforeEach(() => {
    resetForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading message, then the saved settings', async () => {
    render(<SettingsPage />);

    expect(screen.getByText(/loading settings/i)).toBeInTheDocument();

    expect(await screen.findByLabelText('Display name')).toHaveValue('Riya Natarajan');
    expect(screen.queryByText(/loading settings/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('riya.natarajan@example.org');
    expect(screen.getByLabelText('Phone')).toHaveValue('+1 503 555 0142');
    expect(screen.getByLabelText('Contact name')).toHaveValue('Sam Natarajan');
    expect(screen.getByRole('checkbox', { name: 'Saturday' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Monday' })).not.toBeChecked();
    expect(screen.getByLabelText('Preferred trail difficulty')).toHaveDisplayValue('Moderate');
    expect(screen.getByLabelText('Reminder lead time')).toHaveDisplayValue('1 day');
    expect(screen.getByLabelText('Time zone')).toHaveValue('America/Los_Angeles');
  });

  it('saves an edited display name', async () => {
    const { user } = await renderLoadedPage();

    const displayName = screen.getByLabelText('Display name');
    await user.clear(displayName);
    await user.type(displayName, 'Riya N.');
    await user.click(saveButton());

    expect(await screen.findByText(/^saved/i)).toBeInTheDocument();
    expect((await loadSettings()).profile.displayName).toBe('Riya N.');
  });

  it('shows an inline error for an invalid email and does not save it', async () => {
    const { user } = await renderLoadedPage();

    const email = screen.getByLabelText('Email');
    await user.clear(email);
    await user.type(email, 'riya.natarajan@');
    await user.click(saveButton());

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(email).toHaveAccessibleDescription(/valid email/i);
    expect(email).toBeInvalid();
    expect(screen.queryByText(/^saved/i)).not.toBeInTheDocument();
    expect((await loadSettings()).profile.email).toBe('riya.natarajan@example.org');
  });

  it('saves the weekly digest preference', async () => {
    const { user } = await renderLoadedPage();

    const digest = screen.getByRole('checkbox', { name: 'Weekly digest' });
    expect(digest).not.toBeChecked();
    await user.click(digest);
    expect(digest).toBeChecked();
    await user.click(saveButton());

    await screen.findByText(/^saved/i);
    expect((await loadSettings()).notifications.weeklyDigest).toBe(true);
  });

  it('saves a new reminder lead time', async () => {
    const { user } = await renderLoadedPage();

    await user.selectOptions(screen.getByLabelText('Reminder lead time'), '2 days');
    await user.click(saveButton());

    await screen.findByText(/^saved/i);
    expect((await loadSettings()).notifications.reminderLeadTime).toBe('2d');
  });

  it('does not delete the account when the confirmation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = await renderLoadedPage();

    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
  });

  it('deletes the account after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = await renderLoadedPage();

    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/account has been deleted/i)).toBeInTheDocument();
  });

  it('exports the volunteer data as a download', async () => {
    const { createObjectURL, restore } = stubObjectUrls();
    // jsdom cannot navigate, so stop the hidden download link from trying.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      const { user } = await renderLoadedPage();

      await user.click(screen.getByRole('button', { name: 'Export my data' }));

      await waitFor(() => expect(exportData).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
      expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
    } finally {
      restore();
    }
  });
});
