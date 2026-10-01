import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIRECTORY = join(process.cwd(), "infrastructure", "static-page-worker");
const BUCKET = "arn:aws:s3:::domits-direct-booking-sites-acceptance";
const PROPERTY_HANDLER = "arn:aws:lambda:eu-north-1:115462458880:function:PropertyHandler";
const SCHEDULER_ROLE = "arn:aws:iam::115462458880:role/domits-static-page-worker-scheduler";

const load = (name) => JSON.parse(readFileSync(join(DIRECTORY, name), "utf8"));
const asList = (value) => (Array.isArray(value) ? value : [value]);
const statementsWith = (policy, effect) => policy.Statement.filter((statement) => statement.Effect === effect);
const actionsOf = (statements) => statements.flatMap((statement) => asList(statement.Action));
const resourcesOf = (statements) => statements.flatMap((statement) => asList(statement.Resource));

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
    expect(actionsOf(allows)).not.toContain("s3:*");
    expect(actionsOf(allows).some((action) => action.startsWith("s3:Delete"))).toBe(false);
    expect(resourcesOf(allows)).not.toContain(`${BUCKET}/*`);
    expect(resourcesOf(allows)).not.toContain("*");
  });

  it("denies every write to the shell, the assets and the crawl files, unconditionally", () => {
    expect(denies).toHaveLength(1);
    const [deny] = denies;
    expect(asList(deny.Action)).toEqual([
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
    ]);
    expect(asList(deny.Resource).sort()).toEqual(
      [`${BUCKET}/index.html`, `${BUCKET}/static/*`, `${BUCKET}/robots.txt`, `${BUCKET}/sitemap.xml`].sort()
    );
    expect(deny).not.toHaveProperty("Condition");
  });
});

describe("the execution role", () => {
  const policy = load("property-handler-base-policy.json");

  it("grants only what the function's code calls, with no S3, no wildcard action and no cluster administration", () => {
    expect(statementsWith(policy, "Deny")).toHaveLength(0);
    const actions = actionsOf(policy.Statement);
    expect(actions.some((action) => action.startsWith("s3:"))).toBe(false);
    expect(actions.some((action) => action === "*" || action.endsWith(":*"))).toBe(false);
    expect(actions.filter((action) => action.startsWith("dsql:")).sort()).toEqual([
      "dsql:DbConnect",
      "dsql:DbConnectAdmin",
    ]);
    expect(
      actions
        .filter((action) => action.startsWith("dynamodb:"))
        .some((action) => /Put|Update|Delete|Write/.test(action))
    ).toBe(false);
    expect(actions).toEqual(
      expect.arrayContaining([
        "ssm:GetParameter",
        "cognito-idp:GetUser",
        "cognito-idp:AdminGetUser",
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

  it("sends the task with a page budget of at most ten, the budget the runbook sizes against the timeout", () => {
    const input = JSON.parse(schedule.Target.Input);
    expect(input).toEqual({ task: "build-static-pages", limit: expect.any(Number) });
    expect(input.limit).toBeGreaterThan(0);
    expect(input.limit).toBeLessThanOrEqual(10);
  });

  it("never retries a failed run and never queues a stale one, so a failure costs one invocation", () => {
    expect(schedule.Target.RetryPolicy).toEqual({ MaximumRetryAttempts: 0, MaximumEventAgeInSeconds: 60 });
    expect(schedule.FlexibleTimeWindow).toEqual({ Mode: "OFF" });
  });

  it("targets the PropertyHandler through a role whose every statement can invoke nothing else", () => {
    const policy = load("scheduler-invoke-policy.json");
    const [trust] = load("scheduler-role-trust.json").Statement;
    expect(schedule.Target.Arn).toBe(PROPERTY_HANDLER);
    expect(schedule.Target.RoleArn).toBe(SCHEDULER_ROLE);
    expect(
      policy.Statement.map((statement) => [statement.Effect, asList(statement.Action), asList(statement.Resource)])
    ).toEqual([["Allow", ["lambda:InvokeFunction"], [PROPERTY_HANDLER]]]);
    expect(trust.Principal).toEqual({ Service: "scheduler.amazonaws.com" });
    expect(trust.Condition).toEqual({ StringEquals: { "aws:SourceAccount": "115462458880" } });
  });
});
