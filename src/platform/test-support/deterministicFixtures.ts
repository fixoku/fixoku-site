export type DeterministicFixture = Readonly<{
  trainerName: "Özlem KAPLAN";
  role: "Eğitmen";
  notificationCount: 3;
  activeStudents: 4;
  plannedLessons: 6;
  availabilityHours: 18;
  currency: "TRY";
  timezone: "Europe/Istanbul";
}>;

export const TRAINER_VISUAL_FIXTURE: DeterministicFixture = Object.freeze({
  trainerName: "Özlem KAPLAN",
  role: "Eğitmen",
  notificationCount: 3,
  activeStudents: 4,
  plannedLessons: 6,
  availabilityHours: 18,
  currency: "TRY",
  timezone: "Europe/Istanbul",
});

export const DETERMINISTIC_FIXTURE_POLICY = Object.freeze({
  seed: "fixoku-phase-1a-trainer-v1",
  dynamicValues: "fixed fixtures only",
  productionAccounts: false,
  livePayment: false,
});

// Synthetic, internally consistent data; not a live ledger or a copy of conflicting screenshot totals.
export const FIXED_VISUAL_DATA = Object.freeze({
  now: "2026-09-08T09:00:00+03:00",
  initials: "TE",
  status: "active",
  finance: { earnedMinor: 1200000, paidMinor: 750000, remainingMinor: 450000 },
  chart: [2, 3, 5, 4, 6] as const,
});
