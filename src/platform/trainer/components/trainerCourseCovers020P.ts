// FIXOKU_020P_EXACT_EIGHT_COVERS
// Explicit identities and actual filenames supplied with the project's teacher-panel/courses folder.
const BASE = "/images/teacher-panel/courses/";
const names = {
  primary: "ilkokul-akici-ve-hizli-okuma-egitmen-egitimi.png",
  middle: "ortaokul-hizli-okuma-egitmen-egitimi.png",
  high: "lise-hizli-okuma-egitmen-egitimi.png",
  adult: "yetiskin-hizli-okuma-egitmen-egitimi.png",
  middleParagraph: "ortaokul-paragraf-egitmen-egitimi.png",
  highParagraph: "lise-paragraf-egitmen-egitimi.png",
  speedSet: "ortaokul-lise-yetiskin-hizli-okuma-egitmen-egitimi.png",
  paragraphSet: "ortaokul-lise-paragraraf-egitmen-egitimi-2li-set.png",
} as const;
const normalize = (text: string) => String(text || "").toLocaleLowerCase("tr-TR")
  .replaceAll("ı", "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function trainerCourseCover020P(title: string, slug = ""): string | undefined {
  const value = normalize(`${title} ${slug}`);
  const paragraph = /paragraf|paragraph|paragraraf/.test(value);
  const school = /ilkokul|primary/.test(value);
  const middle = /ortaokul|middle/.test(value);
  const high = /lise|high/.test(value);
  const adult = /yetiskin|adult/.test(value);
  // Sets must win before grade-specific packages.
  if (middle && high && adult && !paragraph) return BASE + names.speedSet;
  if (middle && high && paragraph) return BASE + names.paragraphSet;
  if (school && /akici|akıcı/.test(value)) return BASE + names.primary;
  if (middle && paragraph) return BASE + names.middleParagraph;
  if (high && paragraph) return BASE + names.highParagraph;
  if (middle && !high && !adult) return BASE + names.middle;
  if (high && !middle && !adult) return BASE + names.high;
  if (adult && !middle && !high) return BASE + names.adult;
  return undefined;
}
