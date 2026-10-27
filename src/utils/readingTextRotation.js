import { getReadingTextsForGrade, normalizeReadingGradeKey } from "../data/readingMeasurementTexts.js";

const STORAGE_KEY = "fixoku-reading-text-rotation-v1";

function randomIndex(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive pozitif bir tam sayı olmalıdır.");
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const value = new Uint32Array(1);
    do {
      globalThis.crypto.getRandomValues(value);
    } while (value[0] >= limit);
    return value[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function shuffle(ids) {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function readState() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage kapalıysa test yine çalışır; yalnızca kalıcı rotasyon korunamaz.
  }
}

function createFreshDeck(ids, lastId) {
  const deck = shuffle(ids);
  if (deck.length > 1 && deck[0] === lastId) {
    const swapIndex = 1 + randomIndex(deck.length - 1);
    [deck[0], deck[swapIndex]] = [deck[swapIndex], deck[0]];
  }
  return deck;
}

/**
 * Sınıf havuzundan sıradaki rastgele metni seçer.
 *
 * - Aynı test oturumunda yalnızca bir kez çağrılmalıdır.
 * - Her sınıf için karıştırılmış bir deste kullanır.
 * - Havuzdaki tüm metinler gösterilmeden tekrar etmez.
 * - Yeni tur başladığında önceki turun son metnini hemen tekrarlamaz.
 * - Rotasyon aynı tarayıcıda localStorage ile korunur.
 */
export function getNextReadingText(grade) {
  const gradeKey = normalizeReadingGradeKey(grade);
  if (!gradeKey) {
    throw new Error(`Geçersiz sınıf düzeyi: ${String(grade)}`);
  }

  const pool = getReadingTextsForGrade(gradeKey);
  if (pool.length === 0) {
    throw new Error(`${gradeKey} sınıfı için ölçüm metni bulunamadı.`);
  }

  // SSR veya test ortamında deterministik ve güvenli fallback.
  if (typeof window === "undefined") return pool[0];

  const validIds = pool.map((text) => text.id);
  const validIdSet = new Set(validIds);
  const state = readState();
  const saved = state[gradeKey] ?? {};
  let remainingIds = Array.isArray(saved.remainingIds)
    ? saved.remainingIds.filter((id) => validIdSet.has(id))
    : [];
  const lastId = validIdSet.has(saved.lastId) ? saved.lastId : null;

  if (remainingIds.length === 0) {
    remainingIds = createFreshDeck(validIds, lastId);
  }

  const selectedId = remainingIds.shift();
  state[gradeKey] = { remainingIds, lastId: selectedId };
  writeState(state);

  return pool.find((text) => text.id === selectedId) ?? pool[0];
}

export function resetReadingTextRotation(grade) {
  if (typeof window === "undefined") return;
  const state = readState();
  const gradeKey = normalizeReadingGradeKey(grade);
  if (gradeKey) delete state[gradeKey];
  else Object.keys(state).forEach((key) => delete state[key]);
  writeState(state);
}
