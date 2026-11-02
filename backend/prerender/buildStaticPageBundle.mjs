import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const ENTRY = join(HERE, "staticPageEntry.mjs");
const DEFAULT_OUTFILE = join(REPO_ROOT, "backend", "functions", "PropertyHandler", "generated", "staticPageBundle.mjs");

const STUBS = [
  { name: "react", filter: /^react$/, module: join(HERE, "stubs", "react.js") },
  { name: "mui-icons", filter: /^@mui\/icons-material(\/.*)?$/, module: join(HERE, "stubs", "muiIcon.js") },
  { name: "prop-types", filter: /^prop-types$/, module: join(HERE, "stubs", "muiIcon.js") },
  { name: "icon-wrapper", filter: /(^|\/)iconWrapper$/, module: join(HERE, "stubs", "muiIcon.js") },
];

const stubPlugin = ({ name, filter, module }) => ({
  name: `stub-${name}`,
  setup(build) {
    build.onResolve({ filter }, () => ({ path: module }));
  },
});

export const buildStaticPageBundle = async ({ outfile = DEFAULT_OUTFILE, esbuildPath } = {}) => {
  const { build } = await import(esbuildPath || process.env.ESBUILD_MODULE || "esbuild");
  const result = await build({
    entryPoints: [ENTRY],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    loader: { ".js": "jsx", ".jsx": "jsx" },
    jsx: "transform",
    logLevel: "warning",
    metafile: true,
    plugins: STUBS.map(stubPlugin),
  });

  const inputs = Object.keys(result.metafile.inputs);
  const leaked = inputs.filter((input) => input.includes("node_modules"));
  if (leaked.length > 0) {
    throw new Error(`The static page bundle must not contain packages: ${leaked.slice(0, 5).join(", ")}`);
  }

  const [output] = Object.values(result.metafile.outputs);
  const remainingImports = (output?.imports ?? []).map((entry) => entry.path);
  if (remainingImports.length > 0) {
    throw new Error(`The static page bundle must not import anything: ${remainingImports.join(", ")}`);
  }

  const bundled = readFileSync(outfile, "utf8");
  const dynamicRequest = /(?:\b|_)(?:import|require|__require|__toESM)\s*\(/.exec(bundled);
  if (dynamicRequest) {
    const around = bundled.slice(dynamicRequest.index, dynamicRequest.index + 80);
    throw new Error(`The static page bundle must not ask for anything at runtime: ${around}`);
  }

  return { outfile, moduleCount: inputs.length, bytes: output?.bytes ?? 0 };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { moduleCount, bytes } = await buildStaticPageBundle({ outfile: DEFAULT_OUTFILE });
  console.log(`bundled ${moduleCount} modules into ${DEFAULT_OUTFILE} (${bytes} bytes)`);
}
