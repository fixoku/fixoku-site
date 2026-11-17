import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), ".."
);

const hash = file =>
  crypto.createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex").toUpperCase();

function requireCondition(condition, code) {
  if (!condition) throw new Error(code);
}

try {
  requireCondition(
    process.argv.length === 2,
    "EXECUTION_ARGUMENTS_FORBIDDEN"
  );

  requireCondition(
    process.env.VERCEL_ENV !== "production" &&
    process.env.NODE_ENV !== "production",
    "PRODUCTION_FORBIDDEN"
  );

  const journal = path.join(
    root, "drizzle/migrations/meta/_journal.json"
  );

  requireCondition(
    hash(journal) ===
    "FB0990B0CAAF4B98A0EA07992321758F51FB722CCC80FB90DB2523E63485B80D",
    "LEGACY_JOURNAL_CHANGED"
  );

  const journalData = JSON.parse(
    fs.readFileSync(journal, "utf8")
  );

  requireCondition(
    journalData.entries.length === 51,
    "LEGACY_JOURNAL_COUNT"
  );

  const directory = path.join(
    root, "drizzle/controlled-migrations/r399"
  );

  const manifestFile = path.join(directory, "manifest.json");

  requireCondition(
    hash(manifestFile) ===
    "E0E6A44C10E72E7A7AB50F679288492B2367ACAC1278D750EBE85C512BFDDE9F",
    "MANIFEST_HASH"
  );

  const manifest = JSON.parse(
    fs.readFileSync(manifestFile, "utf8")
  );

  requireCondition(
    manifest.release === "R399" &&
    manifest.automaticExecution === false &&
    manifest.productionApproved === false &&
    manifest.stagingApproved === false,
    "MANIFEST_SAFETY"
  );

  const expected = [
    [
      "R399_01_CLASS_SCHEMA.sql",
      "57D256CDE14769A127743E4EDFAFF6155519C651CF16DBD4774DB9FE78B28405"
    ],
    [
      "R399_02_INDIVIDUAL_HISTORY.sql",
      "6B6DD787B240C45D345F5297CD5CAF41F9FFED5B696D487A081F43BDF8C1454B"
    ],
    [
      "R399_03_PARTICIPANT_HISTORY.sql",
      "35DB48EC40B669B50BEDCB16916C33220D9D5BE420369926830DD4C515F7E47F"
    ]
  ];

  requireCondition(
    JSON.stringify(manifest.executionOrder) ===
    JSON.stringify(expected.map(item => item[0])),
    "EXECUTION_ORDER"
  );

  for (const [name, checksum] of expected) {
    const file = path.join(directory, name);

    requireCondition(
      hash(file) === checksum &&
      manifest.sha256[name] === checksum,
      "SQL_HASH_MISMATCH:" + name
    );

    console.log("SQL_HASH_PASS=" + name);
  }

  console.log("LEGACY_JOURNAL=UNCHANGED");
  console.log("MANIFEST_SAFETY=PASS");
  console.log("EXECUTION_ORDER=PASS");
  console.log("AUTOMATIC_EXECUTION=DISABLED");
  console.log("DATABASE_CONNECTION=NO");
  console.log("DATABASE_WRITE=NO");
  console.log("R399_PREFLIGHT=PASS");

} catch (error) {
  console.error("BLOCKED=" + error.message);
  process.exitCode = 1;
}
