import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAliasRows, withAliases } from "./alias-map.mjs";

const FUNCTION_PATH = fileURLToPath(new URL("./viewer-request.js", import.meta.url));
const [resultPath] = process.argv.slice(2);

if (!resultPath) {
  console.error("Usage: node infrastructure/static-page-edge/write-aliases.mjs <alias query result as tsv>");
  process.exit(2);
}

try {
  const pairs = parseAliasRows(readFileSync(resultPath, "utf8"));
  const written = withAliases(readFileSync(FUNCTION_PATH, "utf8"), pairs);
  writeFileSync(FUNCTION_PATH, written);
  console.log(`Aliases written: ${pairs.length}. The function is now ${Buffer.byteLength(written, "utf8")} bytes.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
