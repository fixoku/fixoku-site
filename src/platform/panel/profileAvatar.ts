const profileFallbacks: Readonly<Record<string, string>> = {
  ersin: "/images/profiles/ersin.jpg",
  "elif usta": "/images/profiles/elif.jpg",
  elif: "/images/profiles/elif.jpg",
  "ozlem kaplan": "/images/profiles/ozlem.jpg",
  ozlem: "/images/profiles/ozlem.jpg",
  "hatice kubra usta": "/images/profiles/hatice.jpg",
  "hatice kubra": "/images/profiles/hatice.jpg",
  hatice: "/images/profiles/hatice.jpg",
  "ali asaf usta": "/images/profiles/ali-asaf.jpg",
  "ali asaf": "/images/profiles/ali-asaf.jpg",
};

function normalizeIdentity(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9 ]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Returns the supplied profile URL first, then the bounded local-review yedek. */
export function resolveProfileImage({
  name,
  email,
  photoUrl,
}: {
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
}) {
  if (photoUrl) return photoUrl;
  const identity = normalizeIdentity(name) || normalizeIdentity(email?.split("@")[0]);
  if (profileFallbacks[identity]) return profileFallbacks[identity];
  return null;
}
