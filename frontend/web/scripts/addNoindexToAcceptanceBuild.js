const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const ACCEPTANCE_BRANCH = "acceptance";
const NOINDEX_TAG = '<meta name="robots" content="noindex, nofollow" />';
const ROBOTS_META_PATTERN = /<meta\b[^>]*\bname\s*=\s*["']?robots\b["']?[^>]*>/gi;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

const isDirectBookingWebsiteSurfaceBuild = (env) =>
  String(env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE || "").trim().toLowerCase() === "true";

const shouldAddNoindexTag = (env = {}) => {
  if (isDirectBookingWebsiteSurfaceBuild(env)) {
    return false;
  }

  return env.AWS_BRANCH === ACCEPTANCE_BRANCH;
};

const findActiveRobotsMetaTags = (html) => [
  ...html.replace(HTML_COMMENT_PATTERN, "").matchAll(ROBOTS_META_PATTERN),
].map((match) => match[0]);

const addNoindexTag = (html) => {
  const activeRobotsMetaTags = findActiveRobotsMetaTags(html);
  const conflicting = activeRobotsMetaTags.filter((tag) => tag !== NOINDEX_TAG);
  if (conflicting.length > 0) {
    throw new Error(`a different robots tag is already present: ${conflicting[0]}`);
  }

  if (activeRobotsMetaTags.length > 0) {
    return html;
  }

  if (!html.includes("</head>")) {
    throw new Error("no closing </head> tag to insert the robots tag before");
  }

  return html.replace("</head>", () => `${NOINDEX_TAG}</head>`);
};

const addNoindexTagToFile = (htmlPath) => {
  const html = readFileSync(htmlPath, "utf8");
  const tagged = addNoindexTag(html);
  if (tagged === html) {
    return false;
  }

  writeFileSync(htmlPath, tagged);
  return true;
};

const run = ({ env = process.env, cwd = process.cwd(), log = console.log, logError = console.error } = {}) => {
  if (!shouldAddNoindexTag(env)) {
    log(`robots noindex tag not applied, AWS_BRANCH=${JSON.stringify(env.AWS_BRANCH)}`);
    return 0;
  }

  const htmlPath = join(cwd, "build", "index.html");
  try {
    const added = addNoindexTagToFile(htmlPath);
    log(added ? `robots noindex tag added to ${htmlPath}` : `robots noindex tag already present in ${htmlPath}`);
    return 0;
  } catch (error) {
    logError(`failed to add the robots noindex tag to ${htmlPath}: ${error.message}`);
    return 1;
  }
};

module.exports = {
  ACCEPTANCE_BRANCH,
  NOINDEX_TAG,
  addNoindexTag,
  addNoindexTagToFile,
  run,
  shouldAddNoindexTag,
};

if (require.main === module) {
  process.exitCode = run();
}
