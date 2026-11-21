export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type TrailDifficulty = 'easy' | 'moderate' | 'strenuous';

export type MaxShiftHours = 3 | 5 | 8;

export type ReminderLeadTime = '1h' | '3h' | '1d' | '2d';

export type DistanceUnit = 'mi' | 'km';

export type FirstDayOfWeek = 'monday' | 'sunday' | 'saturday';

export interface Settings {
  profile: {
    displayName: string;
    email: string;
    /** Optional. Stored as typed, e.g. "+1 503 555 0142". */
    phone: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
  };
  availability: {
    days: Weekday[];
    difficulty: TrailDifficulty;
    maxShiftHours: MaxShiftHours;
  };
  notifications: {
    emailReminders: boolean;
    smsReminders: boolean;
    push: boolean;
    scheduleChanges: boolean;
    crewAnnouncements: boolean;
    weeklyDigest: boolean;
    reminderLeadTime: ReminderLeadTime;
  };
  region: {
    distanceUnit: DistanceUnit;
    /** IANA time zone identifier, e.g. "America/Los_Angeles". */
    timeZone: string;
    firstDayOfWeek: FirstDayOfWeek;
  };
  privacy: {
    showOnRoster: boolean;
    shareHoursWithPartners: boolean;
  };
}

/** Dot paths of the fields the API validates. */
export type SettingsFieldPath =
  | 'profile.displayName'
  | 'profile.email'
  | 'profile.phone'
  | 'emergencyContact.name'
  | 'emergencyContact.phone';

export type FieldErrors = Partial<Record<SettingsFieldPath, string>>;
