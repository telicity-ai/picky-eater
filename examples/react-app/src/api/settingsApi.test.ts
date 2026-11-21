import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SettingsValidationError,
  deleteAccount,
  exportData,
  loadSettings,
  resetForTests,
  saveSettings,
} from './settingsApi';
import type { Settings } from '../types';

async function saveAndCatch(next: Settings): Promise<SettingsValidationError> {
  try {
    await saveSettings(next);
  } catch (error) {
    if (error instanceof SettingsValidationError) return error;
    throw error;
  }
  throw new Error('Expected saveSettings to reject with a SettingsValidationError');
}

describe('settingsApi', () => {
  beforeEach(() => {
    resetForTests();
  });

  it('loads the default settings', async () => {
    const settings = await loadSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.profile.displayName).toBe('Riya Natarajan');
    expect(settings.region.timeZone).toBe('America/Los_Angeles');
  });

  it('returns copies so callers cannot mutate the store', async () => {
    const settings = await loadSettings();
    settings.profile.displayName = 'Changed locally';

    expect((await loadSettings()).profile.displayName).toBe('Riya Natarajan');
  });

  it('persists saved settings', async () => {
    const settings = await loadSettings();
    settings.profile.displayName = 'Riya N.';
    settings.notifications.weeklyDigest = true;
    settings.availability.days = ['fri', 'sat', 'sun'];

    const saved = await saveSettings(settings);
    const reloaded = await loadSettings();

    expect(saved).toEqual(reloaded);
    expect(reloaded.profile.displayName).toBe('Riya N.');
    expect(reloaded.notifications.weeklyDigest).toBe(true);
    expect(reloaded.availability.days).toEqual(['fri', 'sat', 'sun']);
  });

  it('rejects an invalid email with a field error and keeps the stored value', async () => {
    const settings = await loadSettings();
    settings.profile.email = 'riya.natarajan@';

    const error = await saveAndCatch(settings);

    expect(error.fieldErrors['profile.email']).toMatch(/valid email/i);
    expect((await loadSettings()).profile.email).toBe('riya.natarajan@example.org');
  });

  it('rejects an invalid phone number with a field error', async () => {
    const settings = await loadSettings();
    settings.profile.phone = '555-0142';

    const error = await saveAndCatch(settings);

    expect(error.fieldErrors['profile.phone']).toMatch(/country code/i);
    expect((await loadSettings()).profile.phone).toBe('+1 503 555 0142');
  });

  it('allows an empty profile phone number', async () => {
    const settings = await loadSettings();
    settings.profile.phone = '';

    await saveSettings(settings);

    expect((await loadSettings()).profile.phone).toBe('');
  });

  it('requires a valid emergency contact phone number', async () => {
    const settings = await loadSettings();
    settings.emergencyContact.phone = '';
    expect((await saveAndCatch(settings)).fieldErrors['emergencyContact.phone']).toBeDefined();

    settings.emergencyContact.phone = 'call Sam';
    expect((await saveAndCatch(settings)).fieldErrors['emergencyContact.phone']).toMatch(
      /country code/i,
    );
  });

  it('exports the stored data as JSON', async () => {
    const json = await exportData();
    const parsed = JSON.parse(json) as { settings: Settings };

    expect(parsed.settings.profile.email).toBe('riya.natarajan@example.org');
  });

  it('blocks further calls after the account is deleted', async () => {
    await deleteAccount();

    await expect(loadSettings()).rejects.toThrow(/deleted/i);
  });
});
