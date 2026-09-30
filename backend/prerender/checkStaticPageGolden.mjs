import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildStaticPageBundle } from "./buildStaticPageBundle.mjs";
import { StaticPageRenderer } from "../functions/PropertyHandler/business/service/staticPageRenderer.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "__fixtures__");
const GOLDEN_FILE = join(FIXTURES, "staticPage.html");

const generateStaticPage = async () => {
  await buildStaticPageBundle();

  const renderPayload = JSON.parse(readFileSync(join(FIXTURES, "renderPayload.json"), "utf8"));
  const template = readFileSync(join(FIXTURES, "appShell.html"), "utf8");
  const site = {
    ...renderPayload.site,
    publishedPropertySnapshot: renderPayload.propertySnapshot,
    publishedContentOverrides: renderPayload.contentOverrides,
    publishedThemeOverrides: renderPayload.themeOverrides,
  };

  return new StaticPageRenderer().render({ template, site, domain: renderPayload.domain });
};

const page = await generateStaticPage();

if (process.argv.includes("--update")) {
  writeFileSync(GOLDEN_FILE, page);
  console.log(`golden page updated, ${page.length} characters`);
  process.exit(0);
}

const golden = readFileSync(GOLDEN_FILE, "utf8");
if (page === golden) {
  console.log(`the bundled generator still produces the golden page, ${page.length} characters`);
  process.exit(0);
}

console.error("The bundled generator no longer produces the golden page.");
console.error("Run: node backend/prerender/checkStaticPageGolden.mjs --update");
const pageLines = page.split(">");
const goldenLines = golden.split(">");
for (let index = 0; index < Math.max(pageLines.length, goldenLines.length); index += 1) {
  if (pageLines[index] !== goldenLines[index]) {
    console.error(`first difference at fragment ${index}:`);
    console.error(`  golden: ${String(goldenLines[index]).slice(0, 160)}`);
    console.error(`  now:    ${String(pageLines[index]).slice(0, 160)}`);
    break;
  }
}
process.exit(1);
