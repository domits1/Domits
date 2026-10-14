import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  NOINDEX_TAG,
  addNoindexTag,
  addNoindexTagToFile,
  run,
  shouldAddNoindexTag,
} from "../../scripts/addNoindexToAcceptanceBuild";

const APP_SHELL = [
  '<!doctype html><html lang="en"><head>',
  '<meta charset="utf-8" />',
  "<title>Domits - Holiday rentals, campers, boats and more...</title>",
  '<meta name="description" content="Explore the perfect holiday rental on Domits" />',
  '</head><body><div id="root"></div></body></html>',
].join("");

const buildDirWith = (html) => {
  const cwd = mkdtempSync(join(tmpdir(), "noindex-"));
  const buildDir = join(cwd, "build");
  mkdirSync(buildDir);
  const htmlPath = join(buildDir, "index.html");
  writeFileSync(htmlPath, html);
  return { cwd, htmlPath };
};

describe("deciding whether a build gets the robots noindex tag", () => {
  it("adds it on the acceptance branch", () => {
    expect(shouldAddNoindexTag({ AWS_BRANCH: "acceptance" })).toBe(true);
  });

  it("adds nothing on main", () => {
    expect(shouldAddNoindexTag({ AWS_BRANCH: "main" })).toBe(false);
  });

  it("adds nothing when AWS_BRANCH is missing or empty", () => {
    expect(shouldAddNoindexTag({})).toBe(false);
    expect(shouldAddNoindexTag({ AWS_BRANCH: "" })).toBe(false);
    expect(shouldAddNoindexTag({ AWS_BRANCH: undefined })).toBe(false);
  });

  it("adds nothing for any other branch name, however close", () => {
    ["Acceptance", "ACCEPTANCE", " acceptance", "acceptance ", "acceptance-seo", "pre-acceptance", "release"].forEach(
      (branch) => {
        expect(shouldAddNoindexTag({ AWS_BRANCH: branch })).toBe(false);
      }
    );
  });

  it("adds nothing to the direct booking sites bundle, even from the acceptance branch", () => {
    expect(
      shouldAddNoindexTag({ AWS_BRANCH: "acceptance", REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE: "true" })
    ).toBe(false);
    expect(
      shouldAddNoindexTag({ AWS_BRANCH: "acceptance", REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE: "TRUE" })
    ).toBe(false);
  });
});

describe("inserting the robots noindex tag", () => {
  it("puts one tag just before the closing head tag", () => {
    const tagged = addNoindexTag(APP_SHELL);

    expect(tagged).toContain(`${NOINDEX_TAG}</head>`);
    expect(tagged.match(/name="robots"/g)).toHaveLength(1);
    expect(tagged).toContain('<meta charset="utf-8" />');
    expect(tagged).toContain('<div id="root"></div>');
  });

  it("does not add it twice when it runs again", () => {
    const once = addNoindexTag(APP_SHELL);
    const twice = addNoindexTag(once);

    expect(twice).toBe(once);
    expect(twice.match(/name="robots"/g)).toHaveLength(1);
  });

  it("refuses to add a second, conflicting robots tag", () => {
    const shellWithIndexRule = APP_SHELL.replace("</head>", '<meta name="robots" content="index, follow" /></head>');

    expect(() => addNoindexTag(shellWithIndexRule)).toThrow(/different robots tag/);
  });

  it("refuses an app shell without a closing head tag", () => {
    expect(() => addNoindexTag("<html><body><div id=\"root\"></div></body></html>")).toThrow(/<\/head>/);
  });

  it("ignores a robots tag that only sits inside a comment", () => {
    const shellWithCommentedTag = APP_SHELL.replace("</head>", `<!--! ${NOINDEX_TAG} --></head>`);
    const tagged = addNoindexTag(shellWithCommentedTag);

    expect(tagged).toContain(`${NOINDEX_TAG}</head>`);
    expect(tagged.match(/name="robots"/g)).toHaveLength(2);
    expect(addNoindexTag(tagged)).toBe(tagged);
  });

  it("recognises a conflicting robots tag however it is written", () => {
    ['<meta name=robots content="index, follow">', '<meta name = "robots" content="all">'].forEach((tag) => {
      expect(() => addNoindexTag(APP_SHELL.replace("</head>", `${tag}</head>`))).toThrow(/different robots tag/);
    });
  });

  it("refuses when a conflicting tag sits next to our own", () => {
    const shellWithBoth = APP_SHELL.replace("</head>", `${NOINDEX_TAG}<meta name="robots" content="all"></head>`);

    expect(() => addNoindexTag(shellWithBoth)).toThrow(/different robots tag/);
  });
});

describe("running the step the way the build runs it", () => {
  const silence = { log: () => {}, logError: () => {} };

  it("tags the built page on acceptance and reports success", () => {
    const { cwd, htmlPath } = buildDirWith(APP_SHELL);

    expect(run({ ...silence, env: { AWS_BRANCH: "acceptance" }, cwd })).toBe(0);
    expect(readFileSync(htmlPath, "utf8")).toContain(NOINDEX_TAG);
  });

  it("leaves the built page untouched on main", () => {
    const { cwd, htmlPath } = buildDirWith(APP_SHELL);

    expect(run({ ...silence, env: { AWS_BRANCH: "main" }, cwd })).toBe(0);
    expect(readFileSync(htmlPath, "utf8")).toBe(APP_SHELL);
  });

  it("leaves the built page untouched when AWS_BRANCH is missing, as in a local build", () => {
    const { cwd, htmlPath } = buildDirWith(APP_SHELL);

    expect(run({ ...silence, env: {}, cwd })).toBe(0);
    expect(readFileSync(htmlPath, "utf8")).toBe(APP_SHELL);
  });

  it("writes the file only once when the build runs twice", () => {
    const { cwd, htmlPath } = buildDirWith(APP_SHELL);

    run({ ...silence, env: { AWS_BRANCH: "acceptance" }, cwd });
    const afterFirstRun = readFileSync(htmlPath, "utf8");
    expect(addNoindexTagToFile(htmlPath)).toBe(false);

    expect(run({ ...silence, env: { AWS_BRANCH: "acceptance" }, cwd })).toBe(0);
    expect(readFileSync(htmlPath, "utf8")).toBe(afterFirstRun);
    expect(afterFirstRun.match(/name="robots"/g)).toHaveLength(1);
  });

  it("fails loudly on acceptance when the built page is missing", () => {
    const cwd = mkdtempSync(join(tmpdir(), "noindex-"));
    const reported = [];

    expect(run({ env: { AWS_BRANCH: "acceptance" }, cwd, log: () => {}, logError: (m) => reported.push(m) })).toBe(1);
    expect(reported.join(" ")).toContain("failed to add the robots noindex tag");
  });

  it("stays silent and successful on main when the built page is missing", () => {
    const cwd = mkdtempSync(join(tmpdir(), "noindex-"));

    expect(run({ ...silence, env: { AWS_BRANCH: "main" }, cwd })).toBe(0);
  });

  it("fails loudly on acceptance when the built page cannot be read", () => {
    const cwd = mkdtempSync(join(tmpdir(), "noindex-"));
    mkdirSync(join(cwd, "build", "index.html"), { recursive: true });
    const reported = [];

    expect(run({ env: { AWS_BRANCH: "acceptance" }, cwd, log: () => {}, logError: (m) => reported.push(m) })).toBe(1);
    expect(reported.join(" ")).toContain("failed to add the robots noindex tag");
  });

  it("fails loudly on acceptance when the built page carries a conflicting robots tag", () => {
    const { cwd } = buildDirWith(APP_SHELL.replace("</head>", '<meta name="robots" content="all"></head>'));
    const reported = [];

    expect(run({ env: { AWS_BRANCH: "acceptance" }, cwd, log: () => {}, logError: (m) => reported.push(m) })).toBe(1);
    expect(reported.join(" ")).toContain("different robots tag");
  });

  it("makes the build fail, by exiting non-zero when it is run as a command", () => {
    const scriptPath = require.resolve("../../scripts/addNoindexToAcceptanceBuild");
    const { cwd } = buildDirWith(APP_SHELL);
    const missing = mkdtempSync(join(tmpdir(), "noindex-"));

    const onAcceptance = spawnSync(process.execPath, [scriptPath], { cwd, env: { AWS_BRANCH: "acceptance" } });
    const onAcceptanceWithoutBuild = spawnSync(process.execPath, [scriptPath], {
      cwd: missing,
      env: { AWS_BRANCH: "acceptance" },
    });
    const onMainWithoutBuild = spawnSync(process.execPath, [scriptPath], { cwd: missing, env: { AWS_BRANCH: "main" } });

    expect(onAcceptance.status).toBe(0);
    expect(readFileSync(join(cwd, "build", "index.html"), "utf8")).toContain(NOINDEX_TAG);
    expect(onAcceptanceWithoutBuild.status).toBe(1);
    expect(onMainWithoutBuild.status).toBe(0);
  });

  it("says in the log which branch it decided on", () => {
    const logged = [];

    run({ env: { AWS_BRANCH: "main" }, cwd: tmpdir(), log: (m) => logged.push(m), logError: () => {} });

    expect(logged.join(" ")).toContain('AWS_BRANCH="main"');
  });
});
