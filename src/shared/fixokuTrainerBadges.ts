export type FixokuTrainerBadge = { key: string; name: string; src: string; aliases: string[] };
export const FIXOKU_TRAINER_BADGES: FixokuTrainerBadge[] = [
  { key: 'ilkokul-akici', name: 'İlkokul Akıcı Okuma Eğitmeni', src: '/fixoku-trainer-badges/ilkokul-akici-okuma-egitmen-rozeti.png', aliases: ['İlkokul Akıcı Okuma Eğitmeni', 'İlkokul Akıcı Okuma'] },
  { key: 'kidemli', name: 'Kıdemli Eğitmen', src: '/fixoku-trainer-badges/kidemli-egitmen-rozeti.png', aliases: ['Kıdemli Eğitmen'] },
  { key: 'lise-hizli', name: 'Lise Hızlı Okuma Eğitmeni', src: '/fixoku-trainer-badges/lise-hizli-okuma-egitmen-rozeti.png', aliases: ['Lise Hızlı Okuma Eğitmeni', 'Lise Hızlı Okuma'] },
  { key: 'lise-paragraf', name: 'Lise Paragraf Eğitmeni', src: '/fixoku-trainer-badges/lise-paragraf-egitmen-rozeti.png', aliases: ['Lise Paragraf Eğitmeni', 'Lise Paragraf'] },
  { key: 'ortaokul-hizli', name: 'Ortaokul Hızlı Okuma Eğitmeni', src: '/fixoku-trainer-badges/ortaokul-hizli-okuma-egitmen-rozeti.png', aliases: ['Ortaokul Hızlı Okuma Eğitmeni', 'Ortaokul Hızlı Okuma'] },
  { key: 'ortaokul-paragraf', name: 'Ortaokul Paragraf Eğitmeni', src: '/fixoku-trainer-badges/ortaokul-paragraf-egitmen-rozet.png', aliases: ['Ortaokul Paragraf Eğitmeni', 'Ortaokul Paragraf'] },
  { key: 'yetiskin-hizli', name: 'Yetişkin Hızlı Okuma Eğitmeni', src: '/fixoku-trainer-badges/yetiskin-hizli-okuma-egitmen-rozet.png', aliases: ['Yetişkin Hızlı Okuma Eğitmeni', 'Yetişkin Hızlı Okuma'] },
];
export function normalizeFixokuTrainerBadgeText(text: string): string {
  return text.toLocaleLowerCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/\s+/g, ' ').trim();
}
export function badgeForTrainerText(text: string): FixokuTrainerBadge | undefined {
  const value = normalizeFixokuTrainerBadgeText(text);
  return FIXOKU_TRAINER_BADGES.find((badge) => badge.aliases.some((alias) => normalizeFixokuTrainerBadgeText(alias) === value));
}