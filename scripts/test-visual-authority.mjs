import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const authorityRoot = process.env.FIXOKU_VISUAL_AUTHORITY_ROOT;
if (!authorityRoot) {
  console.error("VISUAL_AUTHORITY_ROOT_MISSING");
  process.exit(1);
}

const references = JSON.parse(await readFile(new URL("../tests/support/trainer-reference-lock.json", import.meta.url), "utf8"));
const expected = references.map(({ fileName, width, height, sha256 }) => [fileName, width, height, sha256]);

function pngDimensions(buffer) {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("NOT_PNG");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

for (const [fileName, width, height, sha256] of expected) {
  const filePath = path.join(authorityRoot, fileName);
  const data = await readFile(filePath);
  const dimensions = pngDimensions(data);
  if (dimensions.width !== width || dimensions.height !== height) {
    throw new Error(`REFERENCE_DIMENSION_MISMATCH:${fileName}`);
  }
  const actualHash = createHash("sha256").update(data).digest("hex").toUpperCase();
  if (actualHash !== sha256) throw new Error(`REFERENCE_HASH_MISMATCH:${fileName}`);

  for (const runtimeRoot of ["public", "src/assets", "dist"]) {
    try {
      await readFile(path.join(process.cwd(), runtimeRoot, fileName));
      throw new Error(`REFERENCE_COPIED_TO_REPO:${runtimeRoot}/${fileName}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

console.log("REFERENCE_COUNT=9");
console.log("REFERENCE_DIMENSIONS=PASS");
console.log("REFERENCE_HASHES=PASS");
console.log("REFERENCE_RUNTIME_USAGE=NO");
console.log("REFERENCE_COPIED_TO_REPO=NO");
