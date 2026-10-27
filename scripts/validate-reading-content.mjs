import { readingMeasurementTextsByGrade } from "../src/data/readingMeasurementTexts.js";

const expectedCounts = { "3": 10, "4": 10, "5-6": 5, "7-8": 5, lise: 10 };
const ids = new Set();
let total = 0;

for (const [grade, texts] of Object.entries(readingMeasurementTextsByGrade)) {
  if (texts.length !== expectedCounts[grade]) {
    throw new Error(`${grade}: ${expectedCounts[grade]} metin bekleniyordu, ${texts.length} bulundu.`);
  }

  for (const text of texts) {
    total += 1;
    if (ids.has(text.id)) throw new Error(`Tekrarlı metin kimliği: ${text.id}`);
    ids.add(text.id);
    if (!text.title || !text.content || text.wordCount <= 0) throw new Error(`Eksik metin: ${text.id}`);
    if (text.questions.length !== 5) throw new Error(`${text.id}: 5 soru bulunmalı.`);

    for (const question of text.questions) {
      if (question.options.length !== 4) throw new Error(`${text.id}/${question.id}: 4 seçenek bulunmalı.`);
      const keys = question.options.map((option) => option.key);
      if (keys.join("") !== "ABCD") throw new Error(`${text.id}/${question.id}: seçenek sırası ABCD olmalı.`);
      if (!keys.includes(question.correctAnswer)) throw new Error(`${text.id}/${question.id}: geçersiz doğru cevap.`);
    }
  }
}

if (total !== 40) throw new Error(`Toplam 40 metin bekleniyordu, ${total} bulundu.`);
console.log(`Fixoku ölçüm içeriği doğrulandı: ${total} metin, ${total * 5} soru.`);
