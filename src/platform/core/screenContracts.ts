export type ScreenId =
  | "trainer-dashboard"
  | "trainer-profile"
  | "trainer-trainings"
  | "trainer-presentations"
  | "trainer-resources"
  | "trainer-students"
  | "trainer-student-detail"
  | "trainer-earnings"
  | "trainer-availability";

export type Viewport = Readonly<{
  width: 1600 | 1448;
  height: 900 | 1086;
}>;

export type VisualScreenContract = Readonly<{
  id: ScreenId;
  referenceFile: string;
  viewport: Viewport;
  route: null;
  thresholdStatus: "ESTIMATED";
}>;

export const VISUAL_AUTHORITY_ROOT_ENV = "FIXOKU_VISUAL_AUTHORITY_ROOT" as const;
export const ACTUAL_OUTPUT_PATH = "test-results/artifacts/<test>/actual" as const;
export const DIFF_OUTPUT_PATH = "test-results/artifacts/<test>/*-diff.png" as const;
export const CANONICAL_VISUAL_BROWSER = "chromium" as const;
export const DEVICE_SCALE_FACTOR = 1 as const;
export const LOCALE = "tr-TR" as const;
export const TIMEZONE = "Europe/Istanbul" as const;

const trainerScreenDefinitions: readonly (readonly [string, 1600 | 1448, 900 | 1086, ScreenId])[] = [
  ["01-trainer-dashboard.png", 1600, 900, "trainer-dashboard"],
  ["02-trainer-profile.png", 1448, 1086, "trainer-profile"],
  ["03-trainer-trainings.png", 1600, 900, "trainer-trainings"],
  ["04-trainer-presentations.png", 1600, 900, "trainer-presentations"],
  ["05-trainer-resources.png", 1600, 900, "trainer-resources"],
  ["06-trainer-students.png", 1600, 900, "trainer-students"],
  ["07-trainer-student-detail.png", 1600, 900, "trainer-student-detail"],
  ["08-trainer-earnings.png", 1600, 900, "trainer-earnings"],
  ["09-trainer-availability.png", 1600, 900, "trainer-availability"],
];

export const TRAINER_SCREEN_CONTRACTS: readonly VisualScreenContract[] = trainerScreenDefinitions.map(([referenceFile, width, height, id]) => ({
  id,
  referenceFile,
  viewport: { width: width as 1600 | 1448, height: height as 900 | 1086 },
  route: null,
  thresholdStatus: "ESTIMATED",
}));

export const VISUAL_HARNESS_POLICY = Object.freeze({
  reference: "external immutable PNG authority",
  actual: ACTUAL_OUTPUT_PATH,
  diff: DIFF_OUTPUT_PATH,
  comparison: "Playwright strict pixel comparison; trainer parity activates in Phase 1B",
  threshold: "estimated until user visual lock",
  runtimeReferenceUsage: false,
});
