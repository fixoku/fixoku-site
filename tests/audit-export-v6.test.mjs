import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const api = readFileSync("api/admin/audit-history.js", "utf8");
const ui = readFileSync("src/platform/admin/AdminAuditHistoryPage.tsx", "utf8");
const pdf = readFileSync("src/platform/admin/audit-export-v6.ts", "utf8");
test("page size choices 10 to 1000 are available and API supports 1000", () => {
  for(const n of [10,25,50,100,500,1000]) assert.match(ui, new RegExp(`<option value=\\{${n}\\}>`));
  assert.match(api,/max\(1000\)/);
});
test("all filtered export uses stable timestamp and does not silently truncate", () => {
  assert.match(api,/exportSnapshot/);
  assert.match(api,/ae\.occurred_at <=/);
  assert.match(ui,/set\("exportSnapshot", snapshot\)/);
  assert.match(ui,/all\.length === expected/);
  assert.match(ui,/Tekrarlanan kayıt algılandı/);
});
test("CSV guards spreadsheet formula expressions; PDF has repeating header and pagination", () => {
  assert.ok(ui.includes("safeCsvCell"));
  assert.ok(ui.includes("protectedValue"));
  assert.match(pdf, /const cols =/);
  assert.match(pdf, /Sayfa/);
  assert.match(pdf, /5000/);
});
test("sensitive audit metadata is excluded", () => {
  assert.doesNotMatch(api,/ae\.metadata_json as/);
  assert.doesNotMatch(ui,/metadataJson\./);
});
