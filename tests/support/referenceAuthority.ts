import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import references from "./trainer-reference-lock.json" with { type: "json" };

export function resolveReference(fileName: string): string {
  const root = process.env.FIXOKU_VISUAL_AUTHORITY_ROOT;
  if (!root) throw new Error("VISUAL_AUTHORITY_ROOT_MISSING");
  if (!references.some((entry) => entry.fileName === fileName)) {
    throw new Error("VISUAL_REFERENCE_NOT_AUTHORIZED");
  }
  return path.resolve(root, fileName);
}

export async function readLockedReference(fileName: string): Promise<Buffer> {
  const entry = references.find((item) => item.fileName === fileName);
  if (!entry) throw new Error("VISUAL_REFERENCE_NOT_AUTHORIZED");
  const bytes = await readFile(resolveReference(fileName));
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || bytes.readUInt32BE(16) !== entry.width || bytes.readUInt32BE(20) !== entry.height) {
    throw new Error(`REFERENCE_DIMENSION_MISMATCH:${fileName}`);
  }
  if (createHash("sha256").update(bytes).digest("hex").toUpperCase() !== entry.sha256) {
    throw new Error(`REFERENCE_HASH_MISMATCH:${fileName}`);
  }
  return bytes;
}
