import { execFileSync } from "node:child_process";
import path from "node:path";

test("deployment configuration preserves, validates and verifies the Lambda environment", () => {
  // Run the deployment ESM entry point in Node, as it runs in GitHub Actions.
  const output = execFileSync(process.execPath,
    ["--test", path.join(__dirname, "configureReviewEnvironment.checks.mjs")], { encoding: "utf8" });
  expect(output).toMatch(/(?:pass 4|tests 4)/);
});
