import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIRECTORY = join(process.cwd(), "infrastructure", "static-page-worker");
const BUCKET = "arn:aws:s3:::domits-direct-booking-sites-acceptance";
const PROPERTY_HANDLER = "arn:aws:lambda:eu-north-1:115462458880:function:PropertyHandler";

const load = (name) => JSON.parse(readFileSync(join(DIRECTORY, name), "utf8"));
const asList = (value) => (Array.isArray(value) ? value : [value]);
const statementsWith = (policy, effect) => policy.Statement.filter((statement) => statement.Effect === effect);

describe("the page writer policy", () => {
  const policy = load("static-page-writer-policy.json");
  const allows = statementsWith(policy, "Allow");
  const denies = statementsWith(policy, "Deny");

  it("allows exactly a read of the app shell and writes under the hostname prefix", () => {
    expect(allows.map((statement) => [asList(statement.Action), asList(statement.Resource)])).toEqual([
      [["s3:GetObject"], [`${BUCKET}/index.html`]],
      [["s3:PutObject"], [`${BUCKET}/sites/by-host/*`]],
    ]);
  });

  it("never grants a wildcard, a bucket-wide write, a delete or a version delete", () => {
    const granted = allows.flatMap((statement) => asList(statement.Action));
    expect(granted).not.toContain("s3:*");
    expect(granted.some((action) => action.startsWith("s3:Delete"))).toBe(false);
    expect(allows.flatMap((statement) => asList(statement.Resource))).not.toContain(`${BUCKET}/*`);
    expect(allows.flatMap((statement) => asList(statement.Resource))).not.toContain("*");
  });

  it("denies every write to the shell and the deployed assets, so no later allow can reach them", () => {
    const [deny] = denies;
    expect(denies).toHaveLength(1);
    expect(asList(deny.Action)).toEqual([
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
    ]);
    expect(asList(deny.Resource)).toEqual(expect.arrayContaining([`${BUCKET}/index.html`, `${BUCKET}/static/*`]));
  });
});

describe("the execution role", () => {
  it("keeps what the shared role grants today, without any S3 action", () => {
    const [statement] = load("property-handler-base-policy.json").Statement;
    expect(asList(statement.Action).some((action) => action.startsWith("s3:"))).toBe(false);
    expect(asList(statement.Action)).toEqual(
      expect.arrayContaining([
        "dsql:*",
        "ssm:GetParameter",
        "cognito-idp:GetUser",
        "lambda:InvokeFunction",
        "logs:PutLogEvents",
      ])
    );
  });

  it("can be assumed by Lambda from this account only", () => {
    const [statement] = load("property-handler-role-trust.json").Statement;
    expect(statement.Principal).toEqual({ Service: "lambda.amazonaws.com" });
    expect(statement.Condition).toEqual({ StringEquals: { "aws:SourceAccount": "115462458880" } });
  });
});

describe("the schedule", () => {
  const schedule = load("schedule.json");

  it("starts disabled, so enabling it is a deliberate last step", () => {
    expect(schedule.State).toBe("DISABLED");
  });

  it("sends the task with a page budget that fits the thirty second timeout", () => {
    const input = JSON.parse(schedule.Target.Input);
    expect(input).toEqual({ task: "build-static-pages", limit: expect.any(Number) });
    expect(input.limit).toBeGreaterThan(0);
    expect(input.limit).toBeLessThanOrEqual(10);
    expect(input).not.toHaveProperty("httpMethod");
  });

  it("never retries a failed run and never queues a stale one, so a failure costs one invocation", () => {
    expect(schedule.Target.RetryPolicy).toEqual({ MaximumRetryAttempts: 0, MaximumEventAgeInSeconds: 60 });
    expect(schedule.FlexibleTimeWindow).toEqual({ Mode: "OFF" });
  });

  it("targets the PropertyHandler through a role that can invoke nothing else", () => {
    const [statement] = load("scheduler-invoke-policy.json").Statement;
    const [trust] = load("scheduler-role-trust.json").Statement;
    expect(schedule.Target.Arn).toBe(PROPERTY_HANDLER);
    expect(statement).toMatchObject({ Effect: "Allow", Action: "lambda:InvokeFunction", Resource: PROPERTY_HANDLER });
    expect(trust.Principal).toEqual({ Service: "scheduler.amazonaws.com" });
    expect(trust.Condition).toEqual({ StringEquals: { "aws:SourceAccount": "115462458880" } });
  });
});
