import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as zip from "zip-lib";

// This mirrors the packaging steps in .github/workflows/deploy.yml (create
// deploy_temp, copy function + shared + node_modules, dereference ORM into
// node_modules/database, zip, clean up) but uses zip-lib instead of the
// `zip` CLI so it also runs on Windows dev machines.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SCRIPT_DIR, "..", "..");
const FUNCTIONS_DIR = path.join(BACKEND_DIR, "functions");
const SHARED_DIR = path.join(FUNCTIONS_DIR, ".shared");
const NODE_MODULES_DIR = path.join(BACKEND_DIR, "node_modules");
const ORM_DIR = path.join(BACKEND_DIR, "ORM");

const SHARED_IMPORT_PATTERN =
  /(?:require\(\s*["']([^"']*\.shared[^"']*)["']\s*\)|from\s+["']([^"']*\.shared[^"']*)["'])/;

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)));
    } else if (/\.(js|mjs|cjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// Detects whether a function actually imports backend/functions/.shared,
// so we only bundle it for functions that need it (e.g. company-profile
// does not use it and should not carry the extra weight).
async function usesSharedUtilities(functionDir) {
  const sourceFiles = await collectSourceFiles(functionDir);
  for (const file of sourceFiles) {
    const content = await fs.readFile(file, "utf8");
    if (SHARED_IMPORT_PATTERN.test(content)) {
      return true;
    }
  }
  return false;
}

// zip-lib's archiveFolder has no exclude-filter option (unlike the `zip`
// CLI's -x flag), so the deploy.yml excludes are applied by deleting the
// matching paths from deploy_temp before archiving it.
function isExcludedFromZip(relPath) {
  if (relPath.includes(".git")) return true;

  const segments = relPath.split("/");
  const nodeModulesIndex = segments.indexOf("node_modules");
  if (nodeModulesIndex === -1) return false;

  const lastSegment = segments[segments.length - 1];
  const isInsideNodeModulesPackage = segments.length > nodeModulesIndex + 1;
  return isInsideNodeModulesPackage && (lastSegment === "test" || lastSegment === "docs");
}

async function pruneExcludedPaths(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath).split(path.sep).join("/");

    if (isExcludedFromZip(relPath)) {
      await fs.rm(fullPath, { recursive: true, force: true });
      continue;
    }

    if (entry.isDirectory()) {
      await pruneExcludedPaths(rootDir, fullPath);
    }
  }
}

function formatBytes(bytes) {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function packageFunction(functionName) {
  const functionDir = path.join(FUNCTIONS_DIR, functionName);
  if (!(await pathExists(functionDir))) {
    throw new Error(`Function directory not found: ${functionDir}`);
  }

  const deployTempDir = path.join(BACKEND_DIR, "deploy_temp");
  const zipFile = path.join(BACKEND_DIR, `${functionName}.zip`);

  // Start clean in case a previous run failed before cleanup.
  await fs.rm(deployTempDir, { recursive: true, force: true });
  await fs.rm(zipFile, { force: true });

  try {
    console.log(`Preparing deployment package for "${functionName}"...`);

    // 1 + 2. Create deploy_temp and copy the function's own files into it.
    await fs.mkdir(deployTempDir, { recursive: true });
    await fs.cp(functionDir, deployTempDir, { recursive: true });

    // 3. Copy backend/functions/.shared only if this function imports it.
    if (await pathExists(SHARED_DIR)) {
      if (await usesSharedUtilities(functionDir)) {
        console.log("Function imports .shared - copying shared utilities...");
        await fs.cp(SHARED_DIR, path.join(deployTempDir, ".shared"), { recursive: true });
      } else {
        console.log("Function does not import .shared - skipping.");
      }
    }

    // 4. Copy node_modules (root dependencies). Dereference symlinks (e.g. the
    // node_modules/database -> ../ORM symlink) so this doesn't require elevated
    // permissions on Windows; step 5 overwrites that copy anyway.
    console.log("Copying node_modules (this may take a while)...");
    await fs.cp(NODE_MODULES_DIR, path.join(deployTempDir, "node_modules"), {
      recursive: true,
      dereference: true,
    });

    // 5. Replace the symlinked "database" package with a dereferenced copy of ORM.
    const databaseModulePath = path.join(deployTempDir, "node_modules", "database");
    await fs.rm(databaseModulePath, { recursive: true, force: true });
    await fs.cp(ORM_DIR, databaseModulePath, { recursive: true, dereference: true });

    // 6. Zip deploy_temp, excluding .git and node_modules/*/{test,docs}.
    console.log("Pruning excluded paths before archiving...");
    await pruneExcludedPaths(deployTempDir);

    console.log("Creating zip archive...");
    await zip.archiveFolder(deployTempDir, zipFile);

    const { size } = await fs.stat(zipFile);
    console.log(`\nPackage ready: ${zipFile} (${formatBytes(size)})`);
  } finally {
    // 7. Clean up deploy_temp regardless of success or failure.
    await fs.rm(deployTempDir, { recursive: true, force: true });
  }
}

const FUNCTION_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

const functionName = process.argv[2];
if (!functionName) {
  console.error("Usage: node CD/npm/packageForUpload.js <function-name>");
  process.exit(1);
}

// Validate before any path is built from this value: it must look like a Lambda
// function name (alphanumeric, hyphens, underscores) and must not contain "..",
// so it can't be used to escape FUNCTIONS_DIR or BACKEND_DIR.
if (!FUNCTION_NAME_PATTERN.test(functionName) || functionName.includes("..")) {
  console.error(`Invalid function name: "${functionName}". Use only letters, numbers, hyphens, and underscores.`);
  process.exit(1);
}

try {
  await packageFunction(functionName);
} catch (error) {
  console.error(`Failed to package "${functionName}": ${error.message}`);
  process.exit(1);
}
