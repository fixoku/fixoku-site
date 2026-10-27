import { R97G_TEST_IDENTITIES } from "../shared/r97g-test-identities.js";

const LOCAL_OWNER_REVIEW = import.meta.env.VITE_LOCAL_OWNER_REVIEW === "1" ? {
  slug: "owner-local",
  name: import.meta.env.VITE_LOCAL_OWNER_NAME || "Yerel Owner fixture",
  role: "OWNER",
  roleLabel: "Owner · tek tıklama",
  initials: "O",
} : null;

const R96P_FINAL2_FIXTURE = import.meta.env.VITE_R96P_FINAL2_FIXTURE === "1";
const reviewName = (normal, final2) => R96P_FINAL2_FIXTURE ? final2 : normal;

export const DEMO_IDENTITIES = [
  ...R97G_TEST_IDENTITIES,
  ...(LOCAL_OWNER_REVIEW ? [LOCAL_OWNER_REVIEW] : []),
  { slug: "ersin", name: reviewName("Ersin", "R96P Final 2 Owner"), role: "OWNER", roleLabel: "Sahip / Yönetici", initials: "E" },
  { slug: "fixoku-super-admin", name: reviewName("Fixoku Test Super Admin", "R96P Admin"), role: "SUPER_ADMIN", roleLabel: "Yönetici", initials: "SA" },
  { slug: "ozlem-kaplan", name: reviewName("Özlem KAPLAN", "Özlem KAPLAN"), role: "TRAINER", roleLabel: "Usta Öğretici", initials: "ÖK" },
  { slug: "elif-usta", name: reviewName("Elif USTA", "Elif R96P"), role: "TRAINER", roleLabel: "Usta Öğretici", initials: "EU" },
  { slug: "hatice-kubra-usta", name: reviewName("Hatice Kübra USTA", "R96P Student"), role: "STUDENT", roleLabel: "Öğrenci", initials: "HK" },
  { slug: "ali-asaf-usta", name: "Ali Asaf USTA", role: "STUDENT", roleLabel: "Öğrenci", initials: "AA" },
];

export const isLoopback = () => typeof window !== "undefined" && ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname.toLowerCase());
export const localReviewEnabled = () => import.meta.env.DEV && import.meta.env.VITE_LOCAL_REVIEW_MODE === "1" && (typeof window === "undefined" || isLoopback());
