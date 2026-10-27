// FIXOKU_TRAINER_BADGES_R6: exact aliases for ACTUAL qualification titles shown in the trainer UI.
// Visual-only. Does not grant qualifications or inspect pending purchases.
export type FixokuTrainerBadgeR5 = { id: string; name: string; src: string };

type BadgeEntry = FixokuTrainerBadgeR5 & { aliases: readonly string[] };
const BADGES: readonly BadgeEntry[] = [
  {
    id: 'ilkokul-akici',
    name: 'İlkokul Uzman Hızlı Okuma Eğitmeni',
    src: '/fixoku-trainer-badges/ilkokul-akici-okuma-egitmen-rozeti.png',
    aliases: [
      'İlkokul Uzman Hızlı Okuma Eğitmeni',
      'İlkokul Hızlı Okuma Eğitmeni',
      'İlkokul Akıcı Okuma Eğitmeni',
      'İlkokul Uzman Akıcı Okuma Eğitmeni',
      'İLKOKUL AKICI VE HIZLI OKUMA EĞİTMEN EĞİTİMİ',
      'İlkokul Akıcı ve Hızlı Okuma Eğitmen Eğitimi',
    ],
  },
  {
    id: 'kidemli',
    name: 'Usta Eğitmen',
    src: '/fixoku-trainer-badges/kidemli-egitmen-rozeti.png',
    aliases: [
      'Usta Eğitmen',
      'Kıdemli Eğitmen',
      'FIX OKU KIDEMLİ UZMAN EĞİTMENİ',
      'FIX OKU USTA EĞİTMENİ',
    ],
  },
  {
    id: 'lise-hizli',
    name: 'Lise Uzman Hızlı Okuma Eğitmeni',
    src: '/fixoku-trainer-badges/lise-hizli-okuma-egitmen-rozeti.png',
    aliases: ['Lise Uzman Hızlı Okuma Eğitmeni', 'Lise Hızlı Okuma Eğitmeni'],
  },
  {
    id: 'lise-paragraf',
    name: 'Lise Uzman Paragraf Eğitmeni',
    src: '/fixoku-trainer-badges/lise-paragraf-egitmen-rozeti.png',
    aliases: ['Lise Uzman Paragraf Eğitmeni', 'Lise Paragraf Eğitmeni'],
  },
  {
    id: 'ortaokul-hizli',
    name: 'Ortaokul Uzman Hızlı Okuma Eğitmeni',
    src: '/fixoku-trainer-badges/ortaokul-hizli-okuma-egitmen-rozeti.png',
    aliases: ['Ortaokul Uzman Hızlı Okuma Eğitmeni', 'Ortaokul Hızlı Okuma Eğitmeni'],
  },
  {
    id: 'ortaokul-paragraf',
    name: 'Ortaokul Uzman Paragraf Eğitmeni',
    src: '/fixoku-trainer-badges/ortaokul-paragraf-egitmen-rozet.png',
    aliases: ['Ortaokul Uzman Paragraf Eğitmeni', 'Ortaokul Paragraf Eğitmeni'],
  },
  {
    id: 'yetiskin-hizli',
    name: 'Yetişkin Uzman Hızlı Okuma Eğitmeni',
    src: '/fixoku-trainer-badges/yetiskin-hizli-okuma-egitmen-rozet.png',
    aliases: ['Yetişkin Uzman Hızlı Okuma Eğitmeni', 'Yetişkin Hızlı Okuma Eğitmeni'],
  },
];

const normalized = (text: string): string =>
  text.toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const EXACT_BADGES = new Map<string, FixokuTrainerBadgeR5>();
for (const badge of BADGES) {
  for (const alias of badge.aliases) EXACT_BADGES.set(normalized(alias), badge);
}

export function badgeForQualificationTitleR5(title: string): FixokuTrainerBadgeR5 | null {
  return EXACT_BADGES.get(normalized(title || '')) ?? null;
}
