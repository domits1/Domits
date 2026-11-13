import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_DIR = join(process.cwd(), "..", ".github", "workflows");
const CONFIGURATION_COMMANDS =
  /aws lambda (get-function|get-function-configuration|update-function-code|update-function-configuration)\b/;

const lambdaCommandLines = readdirSync(WORKFLOW_DIR)
  .filter((file) => /\.ya?ml$/.test(file))
  .flatMap((file) =>
    readFileSync(join(WORKFLOW_DIR, file), "utf8")
      .split("\n")
      .filter((line) => CONFIGURATION_COMMANDS.test(line) && !line.trim().startsWith("#"))
      .map((line) => ({ file, line: line.trim() }))
  );

describe("Lambda commands in the workflows", () => {
  it("are found in the deploy workflow", () => {
    expect(lambdaCommandLines.some(({ file }) => file === "deploy.yml")).toBe(true);
  });

  it.each(lambdaCommandLines.map(({ file, line }) => [file, line]))(
    "print at most a status in %s: %s",
    (_file, line) => {
      expect(/>\s*\/dev\/null|--query\s+'[A-Za-z]+'\s+--output\s+text/.test(line)).toBe(true);
    }
  );

  it("still fail the deploy step when the code update fails", () => {
    const deploy = readFileSync(join(WORKFLOW_DIR, "deploy.yml"), "utf8");
    const update = deploy.split("\n").find((line) => line.includes("aws lambda update-function-code"));
    expect(update.trim().startsWith("if ! aws lambda update-function-code")).toBe(true);
    expect(update.trim().endsWith("; then")).toBe(true);
  });
});
