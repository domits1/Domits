import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIRECTORY = join(process.cwd(), "infrastructure", "static-page-worker");
const SITES_BUCKET_PLACEHOLDER = "__SITES_BUCKET__";
const SITES_BUCKET = "example-sites-bucket";
const BUCKET = `arn:aws:s3:::${SITES_BUCKET}`;
const ACCOUNT = "115462458880";
const PROPERTY_HANDLER = `arn:aws:lambda:eu-north-1:${ACCOUNT}:function:PropertyHandler`;
const SCHEDULER_ROLE = `arn:aws:iam::${ACCOUNT}:role/domits-static-page-worker-scheduler`;
const DSQL_CLUSTER = `arn:aws:dsql:eu-west-2:${ACCOUNT}:cluster/6qabud3emiqhbfkh2h4ttwz35i`;
const PARAMETERS_THE_CODE_READS = [
  "/aurora/dsql/region",
  "/aurora/dsql/host",
  "/aurora/dsql/dbName",
  "/aurora/dsql/schema",
  "/direct-booking-website/quote-token-secret",
].map((name) => `arn:aws:ssm:eu-north-1:${ACCOUNT}:parameter${name}`);
const FUNCTIONS_THE_CODE_INVOKES = ["PriceLabs-Integration", "UnifiedMessaging"].map(
  (name) => `arn:aws:lambda:eu-north-1:${ACCOUNT}:function:${name}`
);

const readPolicyText = (name) => readFileSync(join(DIRECTORY, name), "utf8");
const load = (name) => JSON.parse(readPolicyText(name));
const renderSitesBucket = (text) => text.replaceAll(SITES_BUCKET_PLACEHOLDER, SITES_BUCKET);
const asList = (value) => (Array.isArray(value) ? value : [value]);
const statementsWith = (policy, effect) => policy.Statement.filter((statement) => statement.Effect === effect);
const actionsOf = (statements) => statements.flatMap((statement) => asList(statement.Action));
const resourcesOf = (statements) => statements.flatMap((statement) => asList(statement.Resource));
const resourcesForAction = (policy, action) =>
  resourcesOf(statementsWith(policy, "Allow").filter((statement) => asList(statement.Action).includes(action)));

describe("the page writer policy", () => {
  const text = readPolicyText("static-page-writer-policy.json");
  const policy = JSON.parse(renderSitesBucket(text));
  const allows = statementsWith(policy, "Allow");
  const denies = statementsWith(policy, "Deny");

  it("names the sites bucket through one placeholder only, never a literal bucket name", () => {
    expect(text).toContain(SITES_BUCKET_PLACEHOLDER);
    expect(text).not.toMatch(/arn:aws:s3:::(?!__SITES_BUCKET__)/);
    expect(renderSitesBucket(text)).not.toContain(SITES_BUCKET_PLACEHOLDER);
  });

  it("allows exactly a read of the app shell, writes and withdrawals under the hostname prefix, and a listing of that prefix", () => {
    expect(allows.map((statement) => [asList(statement.Action), asList(statement.Resource)])).toEqual([
      [["s3:GetObject"], [`${BUCKET}/index.html`]],
      [["s3:PutObject", "s3:DeleteObject"], [`${BUCKET}/sites/by-host/*`]],
      [["s3:ListBucket"], [BUCKET]],
    ]);
  });

  it("lets the reconciler list the hostname prefix only, never the shell or the assets", () => {
    const [listing] = allows.filter((statement) => asList(statement.Action).includes("s3:ListBucket"));
    expect(listing.Condition).toEqual({ StringLike: { "s3:prefix": "sites/by-host/*" } });
  });

  it("never grants a wildcard, a bucket-wide write, a version delete or a delete outside the hostname prefix", () => {
    expect(actionsOf(allows)).not.toContain("s3:*");
    expect(actionsOf(allows)).not.toContain("s3:DeleteObjectVersion");
    expect(resourcesForAction(policy, "s3:DeleteObject")).toEqual([`${BUCKET}/sites/by-host/*`]);
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
  const actions = actionsOf(policy.Statement);

  it("connects to the one cluster as admin, the user the database package signs its token for, and nothing else on DSQL", () => {
    expect(actions.filter((action) => action.startsWith("dsql:"))).toEqual(["dsql:DbConnectAdmin"]);
    expect(resourcesForAction(policy, "dsql:DbConnectAdmin")).toEqual([DSQL_CLUSTER]);
  });

  it("reads exactly the parameters the code names", () => {
    expect(resourcesForAction(policy, "ssm:GetParameter").sort()).toEqual([...PARAMETERS_THE_CODE_READS].sort());
  });

  it("invokes exactly the functions the code names", () => {
    expect(resourcesForAction(policy, "lambda:InvokeFunction").sort()).toEqual([...FUNCTIONS_THE_CODE_INVOKES].sort());
  });

  it("grants no S3, no wildcard action, no DynamoDB write, and no scoped action on every resource", () => {
    expect(statementsWith(policy, "Deny")).toHaveLength(0);
    expect(actions.some((action) => action.startsWith("s3:"))).toBe(false);
    expect(actions.some((action) => action === "*" || action.endsWith(":*"))).toBe(false);
    expect(
      actions
        .filter((action) => action.startsWith("dynamodb:"))
        .some((action) => /Put|Update|Delete|Write/.test(action))
    ).toBe(false);
    const onEveryResource = actionsOf(policy.Statement.filter((statement) => asList(statement.Resource).includes("*")));
    expect(onEveryResource.some((action) => /^(dsql|ssm|lambda):/.test(action))).toBe(false);
    expect(onEveryResource.sort()).toEqual([
      "cognito-idp:AdminGetUser",
      "cognito-idp:GetUser",
      "dynamodb:GetItem",
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]);
  });

  it("carries the two policies the function needs from the shared role, pinned as files with the same grants", () => {
    expect(load("custom-domains-policy.json")).toEqual({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "ManageTenantsAndCertificatesForCustomDomains",
          Effect: "Allow",
          Action: [
            "cloudfront:CreateDistributionTenant",
            "cloudfront:GetDistributionTenant",
            "cloudfront:GetDistributionTenantByDomain",
            "cloudfront:GetManagedCertificateDetails",
            "cloudfront:UpdateDistributionTenant",
            "cloudfront:DeleteDistributionTenant",
            "cloudfront:VerifyDnsConfiguration",
            "acm:RequestCertificate",
            "acm:AddTagsToCertificate",
            "acm:DescribeCertificate",
            "acm:DeleteCertificate",
          ],
          Resource: "*",
        },
        {
          Sid: "InvalidateWithdrawnPagesOnTheirTenant",
          Effect: "Allow",
          Action: ["cloudfront:ListDistributionTenants", "cloudfront:CreateInvalidationForDistributionTenant"],
          Resource: "*",
        },
      ],
    });
    expect(load("property-images-policy.json")).toEqual({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PropertyImagesAccess",
          Effect: "Allow",
          Action: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
          Resource: "arn:aws:s3:::accommodation/images/*",
        },
      ],
    });
  });

  it("can be assumed by Lambda from this account only", () => {
    const [statement] = load("property-handler-role-trust.json").Statement;
    expect(statement.Principal).toEqual({ Service: "lambda.amazonaws.com" });
    expect(statement.Condition).toEqual({ StringEquals: { "aws:SourceAccount": ACCOUNT } });
  });
});

describe("the reconciler schedule", () => {
  const schedule = load("reconcile-schedule.json");

  it("starts disabled, runs hourly, sends the reconcile task with a bounded limit, and shares the worker's target and retry rules", () => {
    const worker = load("schedule.json");
    expect(schedule.State).toBe("DISABLED");
    expect(schedule.ScheduleExpression).toBe("rate(1 hour)");
    expect(JSON.parse(schedule.Target.Input)).toEqual({ task: "reconcile-static-pages", limit: 50 });
    expect(schedule.Target.Arn).toBe(worker.Target.Arn);
    expect(schedule.Target.RoleArn).toBe(worker.Target.RoleArn);
    expect(schedule.Target.RetryPolicy).toEqual(worker.Target.RetryPolicy);
    expect(schedule.FlexibleTimeWindow).toEqual({ Mode: "OFF" });
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
    expect(trust.Condition).toEqual({ StringEquals: { "aws:SourceAccount": ACCOUNT } });
  });
});
