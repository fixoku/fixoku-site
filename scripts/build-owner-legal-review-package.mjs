import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOwnerLegalReviewPackage, readOwnerLegalReviewSource } from '../src/server/domain/owner-legal-review-package.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'docs', 'legal', 'owner-legal-review-package.md');
const documents = readOwnerLegalReviewSource();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, buildOwnerLegalReviewPackage(), 'utf8');
console.log(JSON.stringify({ outputPath, documentCount: documents.length, allDraft: true, published: false }));
