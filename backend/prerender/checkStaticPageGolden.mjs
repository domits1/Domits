import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildStaticPageBundle } from "./buildStaticPageBundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "__fixtures__");
const GOLDEN_FILE = join(FIXTURES, "staticPage.html");

const generateStaticPage = async () => {
  const bundleFile = join(HERE, "..", "functions", "PropertyHandler", "generated", "staticPageBundle.mjs");
  await buildStaticPageBundle({ outfile: bundleFile });

  const bundle = await import(`${bundleFile}?t=${Date.now()}`);
  const renderPayload = JSON.parse(readFileSync(join(FIXTURES, "renderPayload.json"), "utf8"));
  const template = readFileSync(join(FIXTURES, "appShell.html"), "utf8");

  if (!bundle.canBuildStaticSiteDocument(renderPayload)) {
    throw new Error("The fixture payload should be renderable; the bundle says it is not.");
  }

  const baseModel = bundle.buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot });
  const themedModel = bundle.applyWebsiteDraftThemeOverrides(baseModel, renderPayload.themeOverrides);
  const model = bundle.applyWebsiteDraftContentOverrides(
    themedModel,
    renderPayload.contentOverrides,
    renderPayload.site.templateKey
  );

  return bundle.buildStaticSiteDocument({ template, renderPayload, model });
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
