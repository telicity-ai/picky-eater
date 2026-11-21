import { useEffect, useState, type FormEvent } from 'react';
import {
  SettingsValidationError,
  deleteAccount,
  exportData,
  loadSettings,
  saveSettings,
} from '../api/settingsApi';
import { Button, Checkbox, FormSection, Select, TextField } from '../components';
import type {
  DistanceUnit,
  FieldErrors,
  FirstDayOfWeek,
  MaxShiftHours,
  ReminderLeadTime,
  Settings,
  TrailDifficulty,
  Weekday,
} from '../types';
import { downloadTextFile } from '../utils/download';
import './SettingsPage.css';

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strenuous', label: 'Strenuous' },
];

const MAX_SHIFT_OPTIONS = [
  { value: '3', label: '3 hours' },
  { value: '5', label: '5 hours' },
  { value: '8', label: '8 hours' },
];

const LEAD_TIME_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '3h', label: '3 hours' },
  { value: '1d', label: '1 day' },
  { value: '2d', label: '2 days' },
];

const DISTANCE_OPTIONS = [
  { value: 'mi', label: 'Miles' },
  { value: 'km', label: 'Kilometers' },
];

const TIME_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Phoenix',
  'America/Chicago',
  'America/New_York',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
];

const FIRST_DAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'saturday', label: 'Saturday' },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Shallow-merges a patch into one section of the draft.
  const update = <K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) => {
    setSettings((prev) => (prev ? { ...prev, [section]: { ...prev[section], ...patch } } : prev));
  };

  const toggleDay = (day: Weekday, checked: boolean) => {
    if (!settings) return;
    const days = checked
      ? [...settings.availability.days, day]
      : settings.availability.days.filter((d) => d !== day);
    // keep Mon..Sun order so the saved value is stable
    update('availability', { days: WEEKDAYS.map((w) => w.value).filter((d) => days.includes(d)) });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSaved(false);
    setSaveFailed(false);
    try {
      const result = await saveSettings(settings);
      setSettings(result);
      setErrors({});
      setSaved(true);
    } catch (err) {
      if (err instanceof SettingsValidationError) {
        setErrors(err.fieldErrors);
      } else {
        setSaveFailed(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const json = await exportData();
    downloadTextFile('switchback-data.json', json, 'application/json');
  };

  const handleDelete = async () => {
    // TODO: replace with a proper confirmation step
    if (!window.confirm('Delete your Switchback account? This cannot be undone.')) return;
    await deleteAccount();
    setAccountDeleted(true);
  };

  if (accountDeleted) {
    return (
      <div className="settings-page">
        <h1>Settings</h1>
        <p>Your account has been deleted.</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="settings-page">
        <h1>Settings</h1>
        <p>Couldn't load settings. Refresh the page to try again.</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-page">
        <h1>Settings</h1>
        <p>Loading settings…</p>
      </div>
    );
  }

  const { profile, emergencyContact, availability, notifications, region, privacy } = settings;

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <p className="settings-intro">
        Manage your profile, availability, notifications and account.
      </p>

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <FormSection title="Profile">
          <TextField
            label="Display name"
            value={profile.displayName}
            onChange={(e) => update('profile', { displayName: e.target.value })}
            error={errors['profile.displayName']}
            autoComplete="name"
          />
          <TextField
            label="Email"
            type="email"
            value={profile.email}
            onChange={(e) => update('profile', { email: e.target.value })}
            error={errors['profile.email']}
            autoComplete="email"
          />
          <TextField
            label="Phone"
            type="tel"
            hint="Optional. Include your country code."
            value={profile.phone}
            onChange={(e) => update('profile', { phone: e.target.value })}
            error={errors['profile.phone']}
            autoComplete="tel"
          />
        </FormSection>

        <FormSection
          title="Emergency contact"
          description="Crew leads can see this during shifts you're signed up for."
          className="emergency-section"
        >
          <TextField
            label="Contact name"
            value={emergencyContact.name}
            onChange={(e) => update('emergencyContact', { name: e.target.value })}
            error={errors['emergencyContact.name']}
          />
          <TextField
            label="Contact phone"
            type="tel"
            value={emergencyContact.phone}
            onChange={(e) => update('emergencyContact', { phone: e.target.value })}
            error={errors['emergencyContact.phone']}
          />
        </FormSection>

        <FormSection title="Availability" description="Used to suggest shifts.">
          <fieldset className="weekday-list">
            <legend>Days I can usually volunteer</legend>
            {WEEKDAYS.map((day) => (
              <Checkbox
                key={day.value}
                label={day.label}
                checked={availability.days.includes(day.value)}
                onChange={(e) => toggleDay(day.value, e.target.checked)}
              />
            ))}
          </fieldset>
          <div className="availability-selects">
            <Select
              label="Preferred trail difficulty"
              options={DIFFICULTY_OPTIONS}
              value={availability.difficulty}
              onChange={(e) =>
                update('availability', { difficulty: e.target.value as TrailDifficulty })
              }
            />
            <Select
              label="Max shift length"
              options={MAX_SHIFT_OPTIONS}
              value={String(availability.maxShiftHours)}
              onChange={(e) =>
                update('availability', { maxShiftHours: Number(e.target.value) as MaxShiftHours })
              }
            />
          </div>
        </FormSection>

        <FormSection title="Notifications" className="notifications-section">
          <div className="notification-list">
            <Checkbox
              label="Shift reminders by email"
              checked={notifications.emailReminders}
              onChange={(e) => update('notifications', { emailReminders: e.target.checked })}
            />
            <Checkbox
              label="Shift reminders by SMS"
              checked={notifications.smsReminders}
              onChange={(e) => update('notifications', { smsReminders: e.target.checked })}
            />
            <Checkbox
              label="Push notifications"
              checked={notifications.push}
              onChange={(e) => update('notifications', { push: e.target.checked })}
            />
            <Checkbox
              label="Schedule changes"
              checked={notifications.scheduleChanges}
              onChange={(e) => update('notifications', { scheduleChanges: e.target.checked })}
            />
            <Checkbox
              label="Crew announcements"
              checked={notifications.crewAnnouncements}
              onChange={(e) => update('notifications', { crewAnnouncements: e.target.checked })}
            />
            <Checkbox
              label="Weekly digest"
              checked={notifications.weeklyDigest}
              onChange={(e) => update('notifications', { weeklyDigest: e.target.checked })}
            />
          </div>
          <Select
            label="Reminder lead time"
            options={LEAD_TIME_OPTIONS}
            value={notifications.reminderLeadTime}
            onChange={(e) =>
              update('notifications', { reminderLeadTime: e.target.value as ReminderLeadTime })
            }
            style={{ maxWidth: 200 }}
          />
        </FormSection>

        <FormSection title="Units & region">
          <div className="region-row">
            <Select
              label="Distance units"
              options={DISTANCE_OPTIONS}
              value={region.distanceUnit}
              onChange={(e) => update('region', { distanceUnit: e.target.value as DistanceUnit })}
            />
            <Select
              label="Time zone"
              options={TIME_ZONES.map((tz) => ({ value: tz, label: tz }))}
              value={region.timeZone}
              onChange={(e) => update('region', { timeZone: e.target.value })}
            />
            <Select
              label="First day of week"
              options={FIRST_DAY_OPTIONS}
              value={region.firstDayOfWeek}
              onChange={(e) =>
                update('region', { firstDayOfWeek: e.target.value as FirstDayOfWeek })
              }
            />
          </div>
        </FormSection>

        <FormSection title="Privacy" className="privacy-section">
          <Checkbox
            label="Show my name on the crew roster"
            checked={privacy.showOnRoster}
            onChange={(e) => update('privacy', { showOnRoster: e.target.checked })}
          />
          <Checkbox
            label="Share my logged hours with partner organizations"
            hint="Partner land managers use volunteer hours in grant reports."
            checked={privacy.shareHoursWithPartners}
            onChange={(e) => update('privacy', { shareHoursWithPartners: e.target.checked })}
          />
        </FormSection>

        <FormSection
          title="Account"
          description="Download a copy of your profile, shifts and logged hours, or delete your account."
        >
          <div>
            <Button onClick={handleExport}>Export my data</Button>
          </div>
        </FormSection>

        <div className="settings-actions">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button onClick={handleDelete}>Delete account</Button>
          {saved && <span className="saved-message">Saved.</span>}
          {saveFailed && <span className="save-error">Something went wrong.</span>}
        </div>
      </form>
    </div>
  );
}
