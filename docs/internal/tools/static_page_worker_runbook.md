# Static page worker: role, environment and schedule (2026-10-01)

Runbook for putting the static page worker (`PropertyHandler` invoked with `{"task": "build-static-pages"}`) into service. The files it applies live in `backend/infrastructure/static-page-worker/` and are checked by `backend/test/infrastructure/staticPageWorkerInfrastructure.test.js`. Nothing in the repository applies them; every step below is run by hand, in this order, with `--profile domits` and `--region eu-north-1` unless a command says otherwise.

Run it only after all of these are true, in this order: the migration from [dsql_static_page_outbox_runbook.md](./dsql_static_page_outbox_runbook.md) is applied, and the store, worker and trigger changes are merged and `PropertyHandler` has been deployed with the generated bundle. Step 0 checks every one of them. Until step 9 nothing runs on its own; steps 3 and 6 change something a visitor could notice, and each step says what it changes.

## What this changes, and why it is shaped this way

- **`PropertyHandler` gets its own execution role.** Today it runs on `General-Lambda-Function`, which is shared by about ten functions and carries `AmazonS3FullAccess` plus `s3:PutObject`/`s3:GetObject` on `*`. With that role the worker could overwrite the app shell `index.html` or anything else in any bucket. The new role grants exactly what the shared role grants today **minus every S3 action**, and adds one policy for the pages: read `index.html`, write under `sites/by-host/`, and an explicit deny on the shell and the deployed assets that no later allow can override. The bucket name in the policy is the same one the worker reads from `DIRECT_BOOKING_WEBSITE_SITES_BUCKET`.
- **The schedule is created `DISABLED`** and enabled in the last step, with five pages per run (`limit: 5`) against the function's 30 second timeout, no retries and no stale events, every five minutes. A run that finds nothing costs one invocation and one indexed read.
- **A failed run fails the invocation** (the trigger rejects when a page failed or was not finished). The function's asynchronous retries are set to 0 so a failure runs once per tick, not three times, and an alarm on the function's `Errors` metric makes it visible. The HTTP handler never raises a function error, so that metric belongs to the worker and to crashes only.
- **Two runs cannot work on the same site.** The outbox claim is guarded by site, revision and status, and a row held by a run that died is retried only after its 15 minute lease. Overlap between ticks is not possible at 5 minutes with runs of seconds, and if a run ever hangs, the next one sees `notClaimed` and moves on.

## 0. Preconditions, read-only

```bash
aws lambda get-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --query '{role:Role,timeout:Timeout,memory:MemorySize,lastModified:LastModified,sha:CodeSha256}'
aws lambda get-policy --function-name PropertyHandler --profile domits --region eu-north-1 --query Policy --output text \
  | grep -o '"Service":"[^"]*"' | sort -u
```

Expected: role `arn:aws:iam::115462458880:role/General-Lambda-Function`, timeout 30, memory 1024, `LastModified` after the merge that carried the worker, and `apigateway.amazonaws.com` as the only invoker. If another invoker is listed, stop: step 5 would change its retries too.

The migration: in the DSQL query editor, `SELECT count(*) FROM main.static_page_outbox;` must answer a number, not "relation does not exist". Then on the console, `Lambda → PropertyHandler → Code`, confirm `generated/staticPageBundle.mjs` is in the package; without it every page fails with `RENDER_FAILED`.

Save the state you will compare against and roll back to:

```bash
mkdir -p ~/static-page-worker-rollout && cd ~/static-page-worker-rollout
aws lambda get-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --query 'Environment.Variables' > env-before.json
aws s3api head-object --bucket domits-direct-booking-sites-acceptance --key index.html --profile domits \
  --query '{etag:ETag,modified:LastModified}' > shell-before.json
aws s3api list-objects-v2 --bucket domits-direct-booking-sites-acceptance --prefix sites/by-host/ --profile domits \
  --query 'KeyCount' > pages-before.txt
cat env-before.json | python3 -c 'import json,sys; v=json.load(sys.stdin); print(sorted(v))'
```

Expected: `DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE` is present with value `true` (the worker uses it to call a fallback domain active) and `DIRECT_BOOKING_WEBSITE_SITES_BUCKET` is absent; `pages-before.txt` reads `0`.

## 1. The execution role, nothing uses it yet

```bash
cd /path/to/Domits/backend/infrastructure/static-page-worker
aws iam create-role --role-name domits-property-handler --profile domits \
  --assume-role-policy-document file://property-handler-role-trust.json --query Role.Arn
aws iam put-role-policy --role-name domits-property-handler --policy-name property-handler-base --profile domits \
  --policy-document file://property-handler-base-policy.json
aws iam put-role-policy --role-name domits-property-handler --policy-name static-page-writer --profile domits \
  --policy-document file://static-page-writer-policy.json
for p in DirectBookingQuoteTokenSecretRead DirectBookingWebsiteCustomDomains PropertyImagesAccess; do
  aws iam get-role-policy --role-name General-Lambda-Function --policy-name $p --profile domits \
    --query PolicyDocument --output json > "copied-$p.json"
  aws iam put-role-policy --role-name domits-property-handler --policy-name $p --profile domits \
    --policy-document "file://copied-$p.json"
done
aws iam list-role-policies --role-name domits-property-handler --profile domits
```

Expected: six inline policies: `property-handler-base`, `static-page-writer`, and the three copied from the shared role (the quote token parameter, the CloudFront tenants and certificates for custom domains, the images bucket). Not copied on purpose: `ical-storage`, `host-team-cognito-update-role` and `UnifiedMessagingSecretsManagerAccess` belong to other functions, and `BasicDevPolicy` and `AmazonS3FullAccess` are the broad grants this role exists to drop.

Check with the policy simulator, read-only, before anything uses the role:

```bash
R=arn:aws:iam::115462458880:role/domits-property-handler
B=arn:aws:s3:::domits-direct-booking-sites-acceptance
Q='EvaluationResults[].{action:EvalActionName,perResource:ResourceSpecificResults[].[EvalResourceName,EvalResourceDecision]}'
aws iam simulate-principal-policy --policy-source-arn $R --profile domits --output json --query "$Q" \
  --action-names s3:GetObject s3:PutObject s3:DeleteObject \
  --resource-arns $B/index.html $B/sites/by-host/example.direct.domits.com/index.html \
                  $B/static/js/main.js $B/robots.txt arn:aws:s3:::accommodation/images/x.jpg arn:aws:s3:::any-other-bucket/x
aws iam simulate-principal-policy --policy-source-arn $R --profile domits --output table \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' \
  --action-names ssm:GetParameter dsql:DbConnectAdmin cognito-idp:GetUser cognito-idp:AdminGetUser lambda:InvokeFunction \
                 cloudfront:GetDistributionTenant acm:DescribeCertificate logs:PutLogEvents dynamodb:GetItem
```

Expected per resource in the first call (with several resources the simulator reports under `perResource`, the top-level decision is a summary): `s3:GetObject` allowed on `index.html` and on the images key, implicitDeny elsewhere; `s3:PutObject` allowed on the `sites/by-host/` key and the images key, explicitDeny on `index.html`, `static/`, `robots.txt`, implicitDeny on the other bucket; `s3:DeleteObject` allowed only on the images key, explicitDeny on the shell and the assets. Second call: every action `allowed`. Any `implicitDeny` there means a permission the function uses was not copied: stop, do not continue to step 3.

Rollback: `aws iam delete-role-policy` for each of the six names, then `aws iam delete-role --role-name domits-property-handler`. Harmless while nothing uses it.

## 2. The scheduler role, nothing uses it yet

```bash
aws iam create-role --role-name domits-static-page-worker-scheduler --profile domits \
  --assume-role-policy-document file://scheduler-role-trust.json --query Role.Arn
aws iam put-role-policy --role-name domits-static-page-worker-scheduler --policy-name invoke-property-handler \
  --profile domits --policy-document file://scheduler-invoke-policy.json
aws iam simulate-principal-policy --profile domits --output json \
  --policy-source-arn arn:aws:iam::115462458880:role/domits-static-page-worker-scheduler \
  --query 'EvaluationResults[].ResourceSpecificResults[].[EvalResourceName,EvalResourceDecision]' \
  --action-names lambda:InvokeFunction \
  --resource-arns arn:aws:lambda:eu-north-1:115462458880:function:PropertyHandler \
                  arn:aws:lambda:eu-north-1:115462458880:function:UnifiedMessaging
```

Expected: `allowed` for `PropertyHandler`, `implicitDeny` for `UnifiedMessaging`.

Rollback: `delete-role-policy`, then `delete-role`.

## 3. Switch `PropertyHandler` to its own role [CHANGES THE LIVE API]

Wait at least 15 seconds after step 1 so the role has propagated. From this moment every property request runs with the new role; the blast radius is `PropertyHandler` alone.

```bash
aws lambda update-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --role arn:aws:iam::115462458880:role/domits-property-handler --query '{role:Role,state:LastUpdateStatus}'
aws lambda wait function-updated --function-name PropertyHandler --profile domits --region eu-north-1
aws lambda invoke --function-name PropertyHandler --profile domits --region eu-north-1 --cli-binary-format raw-in-base64-out \
  --payload '{"httpMethod":"GET","resource":"/property/bookingEngine/{subResource}","pathParameters":{"subResource":"all"}}' /dev/stdout \
  | head -c 300; echo
```

Expected: `statusCode` 200 with property cards. That request reads SSM and DSQL with the new role. Then watch the real traffic for ten minutes:

```bash
aws logs filter-log-events --log-group-name /aws/lambda/PropertyHandler --profile domits --region eu-north-1 \
  --start-time $(( $(date +%s) * 1000 - 600000 )) --filter-pattern '"AccessDenied"' --query 'events[].message' --output text | head
```

Expected: nothing. An `AccessDenied` here names the missing permission; roll back first, then add it to the role and repeat the simulator check.

Rollback, about ten seconds:

```bash
aws lambda update-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --role arn:aws:iam::115462458880:role/General-Lambda-Function --query Role
```

## 4. The bucket variable [CHANGES THE LIVE API CONFIGURATION]

`update-function-configuration --environment` replaces the whole variable set, so merge rather than retype:

```bash
cd ~/static-page-worker-rollout
python3 -c 'import json; v=json.load(open("env-before.json")); v["DIRECT_BOOKING_WEBSITE_SITES_BUCKET"]="domits-direct-booking-sites-acceptance"; json.dump({"Variables": v}, open("env-after.json","w"))'
python3 -c 'import json; a=json.load(open("env-before.json")); b=json.load(open("env-after.json"))["Variables"]; print("added:", sorted(set(b)-set(a)), "changed:", [k for k in a if a[k]!=b.get(k)])'
aws lambda update-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --environment file://env-after.json --query 'keys(Environment.Variables)' --output text | tr '\t' '\n' | sort > env-keys-now.txt
aws lambda wait function-updated --function-name PropertyHandler --profile domits --region eu-north-1
python3 -c 'import json; print(sorted(json.load(open("env-before.json"))+["DIRECT_BOOKING_WEBSITE_SITES_BUCKET"]))' | tr -d "[]'," | tr ' ' '\n' | sort | diff - env-keys-now.txt && echo "only the bucket variable was added"
```

Expected: `added: ['DIRECT_BOOKING_WEBSITE_SITES_BUCKET'] changed: []`, then "only the bucket variable was added". Rollback: `--environment file://env-before.json` wrapped the same way, or `python3 -c 'import json; json.dump({"Variables": json.load(open("env-before.json"))}, open("env-restore.json","w"))'` first.

## 5. No asynchronous retries [CHANGES HOW A FAILED TASK RUN BEHAVES]

```bash
aws lambda put-function-event-invoke-config --function-name PropertyHandler --profile domits --region eu-north-1 \
  --maximum-retry-attempts 0 --maximum-event-age-in-seconds 60 \
  --query '{retries:MaximumRetryAttempts,age:MaximumEventAgeInSeconds}'
```

Expected: `retries 0, age 60`. This applies to asynchronous invocations only; API Gateway invokes synchronously and is unaffected, and step 0 confirmed there is no other invoker. Rollback: `aws lambda delete-function-event-invoke-config --function-name PropertyHandler`, which restores the defaults of 2 retries and 6 hours.

## 6. One run by hand, one page [WRITES THE FIRST OBJECT TO S3]

```bash
cd ~/static-page-worker-rollout
aws lambda invoke --function-name PropertyHandler --profile domits --region eu-north-1 --cli-binary-format raw-in-base64-out \
  --payload '{"task":"build-static-pages","limit":1}' run-1.json --query '{status:StatusCode,error:FunctionError}'
cat run-1.json; echo
aws s3api list-objects-v2 --bucket domits-direct-booking-sites-acceptance --prefix sites/by-host/ --profile domits \
  --query 'Contents[].[Key,Size,LastModified]' --output text
aws s3api head-object --bucket domits-direct-booking-sites-acceptance --key index.html --profile domits \
  --query '{etag:ETag,modified:LastModified}' | diff shell-before.json - && echo "the shell is untouched"
```

Expected: `status 200`, no `FunctionError`, a body with `"built":1` (or `"listed":0` if no site has been republished since the migration; then publish one site from the dashboard and run again), one or two objects under `sites/by-host/<hostname>/index.html` of a few kilobytes, and "the shell is untouched". Read one page back and look at it:

```bash
K=$(aws s3api list-objects-v2 --bucket domits-direct-booking-sites-acceptance --prefix sites/by-host/ --profile domits --query 'Contents[0].Key' --output text)
aws s3api head-object --bucket domits-direct-booking-sites-acceptance --key "$K" --profile domits \
  --query '{type:ContentType,cache:CacheControl,meta:Metadata}'
aws s3 cp "s3://domits-direct-booking-sites-acceptance/$K" - --profile domits | grep -o '<title>[^<]*</title>\|<link rel="canonical"[^>]*>\|<meta name="robots"[^>]*>'
```

Expected: `text/html; charset=utf-8`, `public, max-age=300`, metadata `site-id` and `revision`, the site's title, a canonical on its own hostname, `index, follow`. In the DSQL query editor, `SELECT site_id, revision, status, attempt_count, failure_reason FROM main.static_page_outbox ORDER BY updated_at DESC LIMIT 10;` shows that row `ACTIVE`.

A `FunctionError` here is the trigger rejecting: the summary in `run-1.json` names the site and the reason (`RENDER_FAILED` means the bundle is missing from the package, `S3_PUT_FAILED` with `AccessDenied` means step 1 is wrong, `NO_ACTIVE_DOMAIN` means the fallback routing variable). Nothing is served from these objects before the edge change, so a wrong page costs nothing but the fix.

Rollback: the objects are the only change. `aws s3 rm s3://domits-direct-booking-sites-acceptance/sites/by-host/ --recursive --profile domits` removes them (the bucket is versioned, so a delete marker is written; that is enough, nothing routes to the key).

## 7. The schedule, disabled

```bash
cd /path/to/Domits/backend/infrastructure/static-page-worker
aws scheduler create-schedule --profile domits --region eu-north-1 --cli-input-json file://schedule.json --query ScheduleArn
aws scheduler get-schedule --name domits-static-page-worker-rate-5-minutes --profile domits --region eu-north-1 \
  --query '{state:State,expr:ScheduleExpression,input:Target.Input,retry:Target.RetryPolicy,role:Target.RoleArn}'
```

Expected: `state DISABLED`, `rate(5 minutes)`, the task input with `limit 5`, `MaximumRetryAttempts 0`, the scheduler role from step 2. Nothing runs yet. Rollback: `aws scheduler delete-schedule --name domits-static-page-worker-rate-5-minutes`.

## 8. The alarm

```bash
aws cloudwatch put-metric-alarm --profile domits --region eu-north-1 \
  --alarm-name PropertyHandler-static-page-run-failed \
  --alarm-description "A static page run failed or did not finish a page. Read the summary in the PropertyHandler log." \
  --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value=PropertyHandler \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching --alarm-actions arn:aws:sns:eu-north-1:115462458880:Alerts
aws cloudwatch describe-alarms --alarm-names PropertyHandler-static-page-run-failed --profile domits --region eu-north-1 \
  --query 'MetricAlarms[0].[StateValue,Threshold,Period]' --output text
```

Expected: `OK 1.0 300`. `Alerts` is the existing topic with an HTTPS subscriber; check with the team that someone receives it. Rollback: `aws cloudwatch delete-alarms --alarm-names PropertyHandler-static-page-run-failed`.

## 9. Enable the schedule, last [STARTS THE WORKER]

```bash
cd /path/to/Domits/backend/infrastructure/static-page-worker
python3 -c 'import json; s=json.load(open("schedule.json")); s["State"]="ENABLED"; json.dump(s, open("/tmp/schedule-enabled.json","w"))'
aws scheduler update-schedule --profile domits --region eu-north-1 --cli-input-json file:///tmp/schedule-enabled.json --query ScheduleArn
aws scheduler get-schedule --name domits-static-page-worker-rate-5-minutes --profile domits --region eu-north-1 --query State
```

Expected: `ENABLED`. Within six minutes:

```bash
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Invocations --profile domits --region eu-north-1 \
  --dimensions Name=FunctionName,Value=PropertyHandler --statistics Sum --period 300 \
  --start-time $(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ) --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) --query 'Datapoints[].[Timestamp,Sum]' --output text
aws logs filter-log-events --log-group-name /aws/lambda/PropertyHandler --profile domits --region eu-north-1 \
  --start-time $(( $(date +%s) * 1000 - 900000 )) --filter-pattern '"StaticPageWorker"' --query 'events[].message' --output text | tail -5
```

Expected: an invocation per tick and no `[StaticPageWorker]` error lines; the outbox query from step 6 shows no row stuck in `BUILDING` longer than a run.

Rollback, in this order: `aws scheduler update-schedule ... --state DISABLED` (the file from step 7 does exactly that), which stops new runs within one tick; step 6's delete if the objects must go; steps 5, 4 and 3 in reverse only if the role or the configuration is the problem. Disabling the schedule is enough for every failure that is not an `AccessDenied` on the API.

## What it costs per month

Prices for eu-north-1, list, rounded up. The idle polling dominates; the pages themselves are almost free.

| Item | 9 sites | 1000 sites |
| --- | --- | --- |
| EventBridge Scheduler, 8,640 ticks | $0.01 | $0.01 |
| Lambda, 8,640 runs that find nothing, about 0.3 s at 1 GB | $0.05 | $0.05 |
| DSQL, one indexed read per empty run | about $0.07 | about $0.07 |
| Lambda plus DSQL plus S3 per built page, about 1 s and ten statements | under $0.01 for a few republishes | about $0.10 once for the backfill, then under $0.01 |
| S3 storage, about 9 KB per page | $0.00 | $0.00 |
| CloudWatch alarm | $0.10 | $0.10 |
| **Total** | **about $0.25** | **about $0.35, plus about $0.10 once** |

Halving the rate halves the first three lines. A thousand sites backfill in about 17 hours at five pages every five minutes; raise `limit` in the schedule input to 10 for a faster first fill, never above the number of pages that fit in the 30 second timeout (about one second each).
