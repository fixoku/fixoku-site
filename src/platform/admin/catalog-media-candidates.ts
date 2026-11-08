const publicMediaOriginV41F = "https://media.fixoku.com";

export function catalogMediaCandidatesV41F(value: string): string[] {
  const packageMatch = String(value).match(/^(https:\/\/media\.fixoku\.com)?\/images\/fixoku-katalog\/paketler\/([^/]+)\.(?:png|webp)$/u);
  if (packageMatch) {
    const stem = packageMatch[2];
    return [
      `${publicMediaOriginV41F}/images/fixoku-katalog/paketler/${stem}.png`,
      `/images/fixoku-katalog/paketler/${stem}.webp`,
      `/images/fixoku-katalog/paketler/${stem}.png`,
    ];
  }
  if (!String(value).startsWith("/images/fixoku-katalog/") && !String(value).startsWith("/images/teacher-panel/courses/")) return [String(value)];
  return [`${publicMediaOriginV41F}${value}`, String(value)];
}
