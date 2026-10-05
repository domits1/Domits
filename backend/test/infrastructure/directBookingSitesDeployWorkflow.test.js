import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW = readFileSync(
  join(process.cwd(), "..", ".github", "workflows", "deploy-direct-booking-sites.yml"),
  "utf8"
);
const stepNames = [...WORKFLOW.matchAll(/^ {6}- name: (.+)$/gm)].map((match) => match[1]);
const stepAt = (name) => stepNames.indexOf(name);
const stepBody = (name) => {
  const start = WORKFLOW.indexOf(`- name: ${name}`);
  const next = WORKFLOW.indexOf("\n      - name: ", start + 1);
  return WORKFLOW.slice(start, next === -1 ? undefined : next);
};

describe("the direct booking sites deploy", () => {
  it("never deletes from the bucket, so pages built against an earlier shell keep their hashed assets", () => {
    const syncs = WORKFLOW.split("\n").filter((line) => line.includes("aws s3 sync"));
    expect(syncs.length).toBeGreaterThan(0);
    expect(WORKFLOW).not.toContain("--delete");
  });

  it("queues every static page only after the new shell is uploaded and the old one invalidated", () => {
    const queue = stepAt("Queue every static page for the new shell");
    const upload = stepAt("Upload index.html");
    const invalidate = stepAt("Invalidate index.html on every CloudFront tenant");
    expect([queue, upload, invalidate].every((index) => index >= 0)).toBe(true);
    expect(queue).toBeGreaterThan(upload);
    expect(queue).toBeGreaterThan(invalidate);
  });

  it("is opt-in through one variable, and says so when it is off", () => {
    expect(stepBody("Queue every static page for the new shell")).toContain(
      "if: vars.STATIC_PAGE_REGENERATE_ON_DEPLOY == 'true'"
    );
    expect(stepBody("Skip static page regeneration")).toContain("if: vars.STATIC_PAGE_REGENERATE_ON_DEPLOY != 'true'");
  });

  it("only queues, in one attempt, and fails the deploy when the function rejects the task", () => {
    const body = stepBody("Queue every static page for the new shell");
    expect(body).toContain(`--payload '{"task":"queue-all-static-pages"}'`);
    expect(body).toContain('AWS_MAX_ATTEMPTS: "1"');
    expect(WORKFLOW.match(/aws lambda invoke/g)).toHaveLength(1);
    expect(WORKFLOW).not.toContain("build-static-pages");
    expect(body).toContain("--query '{status:StatusCode,error:FunctionError}' --output json > queue-all.meta");
    expect(body).toMatch(/if grep -q '"error": "' queue-all\.meta; then[\s\S]*exit 1/);
  });
});
