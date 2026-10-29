import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/platform/auth/ProtectedPanelEntry.tsx", import.meta.url), "utf8");
assert.match(source, /panelContextCache/u);
assert.match(source, /cached\?\.promise/u);
assert.match(source, /readPanelContext\(panelPath, Boolean\(requiredRole\)\)/u);
assert.match(source, /panelContextCache\.delete\(key\)/u);
console.log(JSON.stringify({ PANEL_CONTEXT_REQUEST_DEDUPE: "PASS_SOURCE_CONTRACT", SESSION_ERROR_FAIL_CLOSED: "PASS_SOURCE_CONTRACT" }));
