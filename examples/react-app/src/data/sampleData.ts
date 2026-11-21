// Synthetic data for the Shifts and My hours pages and for data exports.
// Every name, place and number here is made up.

export interface Shift {
  id: string;
  date: string;
  project: string;
  trail: string;
  time: string;
  spotsTaken: number;
  spotsTotal: number;
  lead: string;
}

export interface HoursEntry {
  id: string;
  date: string;
  project: string;
  hours: number;
  status: 'approved' | 'pending';
}

export const CREW_NAME = 'Cedar Ridge Crew';

export const UPCOMING_SHIFTS: Shift[] = [
  {
    id: 'shift-0614',
    date: 'Sat 14 Jun',
    project: 'Ridge Loop drainage repair',
    trail: 'Ridge Loop',
    time: '8:00–13:00',
    spotsTaken: 6,
    spotsTotal: 8,
    lead: 'Dana Okafor',
  },
  {
    id: 'shift-0615',
    date: 'Sun 15 Jun',
    project: 'Fern Hollow brushing',
    trail: 'Fern Hollow Trail',
    time: '9:00–14:00',
    spotsTaken: 4,
    spotsTotal: 10,
    lead: 'Marcus Lindqvist',
  },
  {
    id: 'shift-0621',
    date: 'Sat 21 Jun',
    project: 'Cedar Ridge step rebuild',
    trail: 'Cedar Ridge Trail',
    time: '7:30–15:30',
    spotsTaken: 8,
    spotsTotal: 8,
    lead: 'Dana Okafor',
  },
  {
    id: 'shift-0625',
    date: 'Wed 25 Jun',
    project: 'Lower Creek tread maintenance',
    trail: 'Lower Creek Trail',
    time: '16:00–19:00',
    spotsTaken: 2,
    spotsTotal: 6,
    lead: 'Priya Castellanos',
  },
  {
    id: 'shift-0628',
    date: 'Sat 28 Jun',
    project: 'Summit Spur blowdown clearing',
    trail: 'Summit Spur',
    time: '8:00–13:00',
    spotsTaken: 5,
    spotsTotal: 12,
    lead: 'Marcus Lindqvist',
  },
];

export const LOGGED_HOURS: HoursEntry[] = [
  {
    id: 'hours-0517',
    date: 'Sat 17 May',
    project: 'Ridge Loop drainage repair',
    hours: 5,
    status: 'approved',
  },
  {
    id: 'hours-0525',
    date: 'Sun 25 May',
    project: 'Fern Hollow brushing',
    hours: 4.5,
    status: 'approved',
  },
  {
    id: 'hours-0531',
    date: 'Sat 31 May',
    project: 'Lookout Trail water bars',
    hours: 6,
    status: 'approved',
  },
  {
    id: 'hours-0607',
    date: 'Sat 7 Jun',
    project: 'Cedar Ridge step rebuild',
    hours: 8,
    status: 'pending',
  },
];
