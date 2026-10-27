/** Display-only title case for Turkish course names. Does not mutate catalog data. */
export function formatTrainerCourseTitle(value: string | null | undefined): string {
  const acronyms = new Set(["lgs", "tyt", "ayt", "pdf", "ivr"]);
  const connectors = new Set(["ve", "ile", "için", "veya"]);
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (token, offset: number) => {
      if (acronyms.has(token)) return token.toLocaleUpperCase("tr-TR");
      if (offset > 0 && connectors.has(token)) return token;
      return token.slice(0, 1).toLocaleUpperCase("tr-TR") + token.slice(1);
    });
}