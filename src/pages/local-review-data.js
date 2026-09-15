export const DEMO_IDENTITIES = [
  { slug: "ersin", name: "Ersin", role: "OWNER", roleLabel: "Sahip / Yönetici", initials: "E" },
  { slug: "ozlem-kaplan", name: "Özlem KAPLAN", role: "TRAINER", roleLabel: "Usta Öğretici", initials: "ÖK" },
  { slug: "elif-usta", name: "Elif USTA", role: "TRAINER", roleLabel: "Usta Öğretici", initials: "EU" },
  { slug: "hatice-kubra-usta", name: "Hatice Kübra USTA", role: "STUDENT", roleLabel: "Öğrenci", initials: "HK" },
  { slug: "ali-asaf-usta", name: "Ali Asaf USTA", role: "STUDENT", roleLabel: "Öğrenci", initials: "AA" },
];

export const isLoopback = () => typeof window !== "undefined" && ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
export const localReviewEnabled = () => import.meta.env.DEV && import.meta.env.VITE_LOCAL_REVIEW_MODE === "1" && (typeof window === "undefined" || isLoopback());
