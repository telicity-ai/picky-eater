// Mock settings API backed by an in-memory store.
//
// It behaves like a small remote service: every call is async, waits for a
// short artificial latency, returns copies (never the stored object), and
// rejects invalid saves with per-field errors.

import { LOGGED_HOURS, UPCOMING_SHIFTS } from '../data/sampleData';
import type { FieldErrors, Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  profile: {
    displayName: 'Riya Natarajan',
    email: 'riya.natarajan@example.org',
    phone: '+1 503 555 0142',
  },
  emergencyContact: {
    name: 'Sam Natarajan',
    phone: '+1 503 555 0199',
  },
  availability: {
    days: ['sat', 'sun'],
    difficulty: 'moderate',
    maxShiftHours: 5,
  },
  notifications: {
    emailReminders: true,
    smsReminders: false,
    push: true,
    scheduleChanges: true,
    crewAnnouncements: true,
    weeklyDigest: false,
    reminderLeadTime: '1d',
  },
  region: {
    distanceUnit: 'mi',
    timeZone: 'America/Los_Angeles',
    firstDayOfWeek: 'monday',
  },
  privacy: {
    showOnRoster: true,
    shareHoursWithPartners: false,
  },
};

const DEFAULT_LATENCY_MS = 350;

let latencyMs = DEFAULT_LATENCY_MS;
let store: Settings = clone(DEFAULT_SETTINGS);
let accountDeleted = false;

export class SettingsValidationError extends Error {
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors) {
    super('Some settings are invalid.');
    this.name = 'SettingsValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class AccountDeletedError extends Error {
  constructor() {
    super('This account has been deleted.');
    this.name = 'AccountDeletedError';
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// E.164-ish: a leading "+", country code, 8–15 digits in total. Spaces,
// dashes, dots and parentheses are allowed as separators.
const PHONE_SEPARATORS = /[\s().-]/g;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return E164_PATTERN.test(value.trim().replace(PHONE_SEPARATORS, ''));
}

export function validateSettings(settings: Settings): FieldErrors {
  const errors: FieldErrors = {};
  const { profile, emergencyContact } = settings;

  if (!profile.displayName.trim()) {
    errors['profile.displayName'] = 'Enter a display name.';
  }

  if (!profile.email.trim()) {
    errors['profile.email'] = 'Enter an email address.';
  } else if (!isValidEmail(profile.email)) {
    errors['profile.email'] = 'Enter a valid email address, like name@example.org.';
  }

  if (profile.phone.trim() && !isValidPhone(profile.phone)) {
    errors['profile.phone'] = 'Enter a phone number with country code, like +1 503 555 0142.';
  }

  if (!emergencyContact.name.trim()) {
    errors['emergencyContact.name'] = 'Enter the name of your emergency contact.';
  }

  if (!emergencyContact.phone.trim()) {
    errors['emergencyContact.phone'] = 'Enter a phone number for your emergency contact.';
  } else if (!isValidPhone(emergencyContact.phone)) {
    errors['emergencyContact.phone'] =
      'Enter a phone number with country code, like +1 503 555 0199.';
  }

  return errors;
}

export async function loadSettings(): Promise<Settings> {
  await simulateLatency();
  assertAccountActive();
  return clone(store);
}

export async function saveSettings(next: Settings): Promise<Settings> {
  await simulateLatency();
  assertAccountActive();

  const errors = validateSettings(next);
  if (Object.keys(errors).length > 0) {
    throw new SettingsValidationError(errors);
  }

  store = normalize(next);
  return clone(store);
}

/** Returns everything stored about the volunteer as a pretty-printed JSON string. */
export async function exportData(): Promise<string> {
  await simulateLatency();
  assertAccountActive();

  return JSON.stringify(
    {
      format: 'switchback-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: store,
      upcomingShifts: UPCOMING_SHIFTS,
      loggedHours: LOGGED_HOURS,
    },
    null,
    2,
  );
}

export async function deleteAccount(): Promise<void> {
  await simulateLatency();
  assertAccountActive();
  accountDeleted = true;
}

/** Changes the artificial latency applied to every call. */
export function setLatency(ms: number): void {
  latencyMs = Math.max(0, ms);
}

/** Restores default data and removes latency. Call it in `beforeEach`. */
export function resetForTests(options: { latencyMs?: number } = {}): void {
  store = clone(DEFAULT_SETTINGS);
  accountDeleted = false;
  latencyMs = options.latencyMs ?? 0;
}

function assertAccountActive(): void {
  if (accountDeleted) {
    throw new AccountDeletedError();
  }
}

function simulateLatency(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, latencyMs);
  });
}

function normalize(settings: Settings): Settings {
  const copy = clone(settings);
  copy.profile.displayName = copy.profile.displayName.trim();
  copy.profile.email = copy.profile.email.trim();
  copy.profile.phone = copy.profile.phone.trim();
  copy.emergencyContact.name = copy.emergencyContact.name.trim();
  copy.emergencyContact.phone = copy.emergencyContact.phone.trim();
  return copy;
}

function clone(settings: Settings): Settings {
  return JSON.parse(JSON.stringify(settings)) as Settings;
}
