const LOCAL_OWNER_REVIEW = import.meta.env.VITE_LOCAL_OWNER_REVIEW === "1" ? {
  slug: "owner-local",
  name: import.meta.env.VITE_LOCAL_OWNER_NAME || "Yerel Owner fixture",
  role: "OWNER",
  roleLabel: "Owner · tek tıklama",
  initials: "O",
} : null;

export const DEMO_IDENTITIES = [
  ...(LOCAL_OWNER_REVIEW ? [LOCAL_OWNER_REVIEW] : []),
  { slug: "ersin", name: "Ersin", role: "OWNER", roleLabel: "Sahip / Yönetici", initials: "E" },
  { slug: "fixoku-super-admin", name: "Fixoku Test Super Admin", role: "SUPER_ADMIN", roleLabel: "Yönetici", initials: "SA" },
  { slug: "ozlem-kaplan", name: "Özlem KAPLAN", role: "TRAINER", roleLabel: "Usta Öğretici", initials: "ÖK" },
  { slug: "elif-usta", name: "Elif USTA", role: "TRAINER", roleLabel: "Usta Öğretici", initials: "EU" },
  { slug: "hatice-kubra-usta", name: "Hatice Kübra USTA", role: "STUDENT", roleLabel: "Öğrenci", initials: "HK" },
  { slug: "ali-asaf-usta", name: "Ali Asaf USTA", role: "STUDENT", roleLabel: "Öğrenci", initials: "AA" },
];

export const isLoopback = () => typeof window !== "undefined" && window.location.hostname === "127.0.0.1";
export const localReviewEnabled = () => import.meta.env.DEV && import.meta.env.VITE_LOCAL_REVIEW_MODE === "1" && (typeof window === "undefined" || isLoopback());
