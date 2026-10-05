# Static page worker: role, environment and schedule (2026-10-01)

Runbook for putting the static page worker (`PropertyHandler` invoked with `{"task": "build-static-pages"}`) into service. The files it applies live in `backend/infrastructure/static-page-worker/` and are checked by `backend/test/infrastructure/staticPageWorkerInfrastructure.test.js`. Nothing in the repository applies them; every step below is run by hand, in this order, with `--profile domits` and `--region eu-north-1` unless a command says otherwise.

Run it only after all of these are true, in this order: the migration from [dsql_static_page_outbox_runbook.md](./dsql_static_page_outbox_runbook.md) is applied, and the store, worker and trigger changes are merged and `PropertyHandler` has been deployed with the generated bundle. Step 0 checks every one of them. Until step 9 nothing runs on its own; steps 3 and 6 change something a visitor could notice, and each step says what it changes.

## What this changes, and why it is shaped this way

- **`PropertyHandler` gets its own execution role.** Today it runs on `General-Lambda-Function`, which is shared by 37 functions (every backend function, the test functions and `PropertyHandler-Dev`) and carries `AmazonS3FullAccess`, `s3:PutObject`/`s3:GetObject` and `dsql:*` on `*`, and a developer policy. With that role the worker could overwrite the app shell `index.html` or anything else in any bucket. The new role grants what the function's code calls, each on the resource the code names: `dsql:DbConnectAdmin` on the one cluster, `ssm:GetParameter` on the five parameters the code reads (the four `/aurora/dsql/*` names in the `database` package and the quote token secret), `lambda:InvokeFunction` on the two functions it invokes (`PriceLabs-Integration`, and `UnifiedMessaging` until the inline Channex calendar sync leaves this function, which has already happened on `acceptance`), plus Cognito user reads, the one DynamoDB read and logs on `*`. `dsql:DbConnect` is not granted: the `database` package signs its token with `getDbConnectAdminAuthToken()` for the `admin` user (`backend/ORM/index.js`), so the function cannot use `DbConnect` until a database role of its own exists, which is a change to every function that uses the package, not to this one. The two inline policies the function still needs from the shared role are pinned as files next to it (`custom-domains-policy.json`, `property-images-policy.json`, copied from the role on 2026-10-02 and checked by the test), so the whole role is reproducible from the repository, and one policy is added for the pages: read `index.html`, write under `sites/by-host/`, and an explicit deny on the shell and the deployed assets that no later allow can override. Dropped on purpose: every S3 grant on `*`, `dsql:*` (which includes deleting the cluster), DynamoDB writes, the developer policy and the two Lambda invoke variants the code never uses. The bucket is not written in the policy: `static-page-writer-policy.json` carries the placeholder `__SITES_BUCKET__`, step 1 renders it from `SITES_BUCKET`, the one place in this runbook that names the bucket, and step 4 puts the same name into `DIRECT_BOOKING_WEBSITE_SITES_BUCKET`. The images policy names `accommodation`, so `S3_BUCKET` (which `propertyImageRepository.js` would use as an override) must stay unset on the function.
- **Considered and rejected: keeping the shared role and only adding the deny.** It would be a smaller change with nothing to break, but it protects four names and nothing else: every other key in the sites bucket (`manifest.json`, `asset-manifest.json`, the icons, any root file a future build adds), every other bucket and the sites bucket's own lifecycle, versioning and policy would stay writable for all 37 functions, and the list of denied names would go stale with the next frontend file. The role switch is the only option that keeps the worker inside its two prefixes.
- **One function and one bucket serve acceptance and production.** `deploy.yml` deploys the same function names from `acceptance` and from `main`, so the `PropertyHandler` behind `acceptance.domits.com` and the one behind `www.domits.com` are the same Lambda, with one role and one environment. The direct booking sites have one CloudFront distribution (`E18TUBOKUXD9TW`), whose only origin is `domits-direct-booking-sites-acceptance`, and its tenants carry hosts' real custom domains and the `*.direct.domits.com` wildcard. The `acceptance` in that bucket name is history, not an environment: there is no production bucket, and this runbook does not create one. If production ever gets its own function and bucket, run steps 1 and 4 again with the other name in `SITES_BUCKET`; nothing else in the policy files changes.
- **The schedule is created `DISABLED`** and enabled in the last step, with five pages per run (`limit: 5`) against the function's 30 second timeout, no retries and no stale events, every five minutes. A run that finds nothing costs one invocation and one indexed read.
- **A failed run fails the invocation** (the trigger rejects when a page failed or was not finished). The function's asynchronous retries are set to 0 so a failure runs once per tick, not three times, and an alarm on the function's `Errors` metric makes it visible. The HTTP handler never raises a function error, so that metric belongs to the worker and to crashes only.
- **A withdrawn page is removed by the same worker.** When a host unpublishes, the site row moves to `PREVIEW` and its outbox row is queued in the same transaction, like a publish; the worker finds the site no longer published, deletes the page object of every domain the site has (also the disabled ones), and invalidates the page path on the tenant that serves each hostname (the custom domain's own tenant, or the wildcard tenant for a fallback domain). Deleting a website removes the objects first, before the domain rows go, because afterwards nobody knows the hostnames; if that removal fails the delete still goes through and the reconciler removes the page later. That is why the writer policy carries `s3:DeleteObject` on the hostname prefix and the custom-domains policy carries `cloudfront:ListDistributionTenants` and `cloudfront:CreateInvalidationForDistributionTenant`. A delete on this versioned bucket writes a delete marker; `s3:DeleteObjectVersion` stays denied.
- **Two runs cannot work on the same site.** The outbox claim is guarded by site, revision and status, and a row held by a run that died or hit the 30 second timeout is retried only after its 15 minute lease, at most five times per revision. Ticks do not overlap at 5 minutes with runs of seconds, but Lambda may deliver an asynchronous event twice and someone may invoke the task by hand during a tick; in both cases the second run sees `notClaimed` and moves on. One case counts no attempt: a shell read that fails happens before the claim, so a broken shell makes every tick fail without using up the five attempts. That costs one invocation per tick, bounded by the rate, and the alarm fires on the first one.

## For colleagues who change `PropertyHandler` later

Once step 3 is done, `PropertyHandler` no longer runs on the shared role. Any new AWS call in `PropertyHandler` (a new SDK command, a new bucket or prefix, a new parameter, a new function to invoke, also through `backend/functions/.shared/` or the `database` package) needs its action and the ARN of the resource added to `backend/infrastructure/static-page-worker/property-handler-base-policy.json` (or a scoped policy next to it), and `backend/test/infrastructure/staticPageWorkerInfrastructure.test.js` updated with it, because the test pins the exact parameter, function and cluster lists **and** applied to the role with `aws iam put-role-policy --role-name domits-property-handler ...`, because no deploy applies IAM. Without that, the route that makes the call answers 500 with `AccessDenied` in the function's log; nothing else breaks. Check first with the simulator command in step 1, and keep the explicit deny: a new allow never overrides it.

## 0. Preconditions, read-only

The person running this needs `iam:PassRole` on the new role (step 3 hands it to Lambda) besides the IAM, Lambda, Scheduler, CloudWatch, logs and S3 actions of the other steps. Checked read-only with `aws iam simulate-principal-policy` on 2026-10-01: the `AWSReservedSSO_Domits-Developer_...` role (the `domits` profile) has every one of them, so a developer can run the whole runbook alone. Repeat the check for another role with the same command and the actions named in each step.

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
export SITES_BUCKET=domits-direct-booking-sites-acceptance
mkdir -p ~/static-page-worker-rollout && cd ~/static-page-worker-rollout
aws lambda get-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --query 'Environment.Variables' > env-before.json
aws s3api head-object --bucket $SITES_BUCKET --key index.html --profile domits \
  --query '{etag:ETag,modified:LastModified}' > shell-before.json
aws s3api list-objects-v2 --bucket $SITES_BUCKET --prefix sites/by-host/ --profile domits \
  --query 'KeyCount' > pages-before.txt
python3 -c 'import json; v=json.load(open("env-before.json")); print(sorted(v)); print("routing:", v.get("DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE"), "bucket:", v.get("DIRECT_BOOKING_WEBSITE_SITES_BUCKET"))'
```

Then the values the scoped role depends on. The policy names the default function names and the default parameter name, and the cluster the host parameter points at:

```bash
python3 -c 'import json; v=json.load(open("env-before.json")); print({k: v.get(k) for k in ("PRICELABS_LAMBDA_NAME", "UNIFIED_MESSAGING_FUNCTION_NAME", "DIRECT_BOOKING_WEBSITE_QUOTE_TOKEN_SECRET_PARAMETER", "S3_BUCKET")})'
aws ssm get-parameter --name /aurora/dsql/host --profile domits --region eu-north-1 --query Parameter.Value --output text
```

Expected: `PRICELABS_LAMBDA_NAME`, `DIRECT_BOOKING_WEBSITE_QUOTE_TOKEN_SECRET_PARAMETER` and `S3_BUCKET` `None`, `UNIFIED_MESSAGING_FUNCTION_NAME` `UnifiedMessaging` (on 2026-10-02 that is the value set on the function), and the host `6qabud3emiqhbfkh2h4ttwz35i.dsql.eu-west-2.on.aws`, the cluster the base policy names. Any other value means the role would deny a call the code makes: stop and change the policy first.

`SITES_BUCKET` is the one place that names the bucket; every later block uses it, so set it again from here in any new shell. Expected: `routing: true bucket: None` (the worker uses the routing flag to call a fallback domain active; the bucket variable is what step 4 adds), `S3_BUCKET` absent from the key list (the role names `accommodation`; an override would point image uploads at a bucket the role cannot reach), and `pages-before.txt` reads `0`.

One more read, in the DSQL query editor: image keys that do not start with `images/` would be refused by the new role on delete, because `PropertyImagesAccess` covers `accommodation/images/*` only.

```sql
SELECT count(*) FROM main.property_image WHERE key NOT LIKE 'images/%';
SELECT count(*) FROM main.property_image_variant WHERE s3_key NOT LIKE 'images/%';
```

Expected: `0` and `0`. If not, note the keys; deleting those images fails until the policy names their prefix.

## 1. The execution role, nothing uses it yet

```bash
cd /path/to/Domits/backend/infrastructure/static-page-worker
aws iam create-role --role-name domits-property-handler --profile domits \
  --assume-role-policy-document file://property-handler-role-trust.json --query Role.Arn
aws iam put-role-policy --role-name domits-property-handler --policy-name property-handler-base --profile domits \
  --policy-document file://property-handler-base-policy.json
sed "s/__SITES_BUCKET__/$SITES_BUCKET/g" static-page-writer-policy.json > ~/static-page-worker-rollout/static-page-writer-policy.json
grep -c "$SITES_BUCKET" ~/static-page-worker-rollout/static-page-writer-policy.json
aws iam put-role-policy --role-name domits-property-handler --policy-name static-page-writer --profile domits \
  --policy-document "file://$HOME/static-page-worker-rollout/static-page-writer-policy.json"
aws iam put-role-policy --role-name domits-property-handler --policy-name custom-domains --profile domits \
  --policy-document file://custom-domains-policy.json
aws iam put-role-policy --role-name domits-property-handler --policy-name property-images --profile domits \
  --policy-document file://property-images-policy.json
for p in DirectBookingWebsiteCustomDomains PropertyImagesAccess; do
  aws iam get-role-policy --role-name General-Lambda-Function --policy-name $p --profile domits --query PolicyDocument --output json
done
aws iam list-role-policies --role-name domits-property-handler --profile domits
```

Expected: `6` from the `grep` (the six places the rendered writer policy names the bucket), then four inline policies: `property-handler-base`, `static-page-writer`, `custom-domains` and `property-images`. The loop prints the two shared-role policies these files were copied from; the first statement of each file must still read the same as the shared policy (same actions, same resource), otherwise the shared role changed since 2026-10-02 and the files need the same change first. `custom-domains-policy.json` carries one more statement on purpose, the tenant listing and invalidation the page withdrawal needs; that one has no counterpart on the shared role. Not copied on purpose: `DirectBookingQuoteTokenSecretRead`, whose one parameter is in the base policy now, `ical-storage`, `host-team-cognito-update-role` and `UnifiedMessagingSecretsManagerAccess` belong to other functions, and `BasicDevPolicy` and `AmazonS3FullAccess` are the broad grants this role exists to drop.

Check with the policy simulator, read-only, before anything uses the role:

```bash
R=arn:aws:iam::115462458880:role/domits-property-handler
B=arn:aws:s3:::$SITES_BUCKET
A=arn:aws:ssm:eu-north-1:115462458880:parameter
L=arn:aws:lambda:eu-north-1:115462458880:function
Q='EvaluationResults[].{action:EvalActionName,perResource:ResourceSpecificResults[].[EvalResourceName,EvalResourceDecision]}'
aws iam simulate-principal-policy --policy-source-arn $R --profile domits --output json --query "$Q" \
  --action-names s3:GetObject s3:PutObject s3:DeleteObject \
  --resource-arns $B/index.html $B/sites/by-host/example.direct.domits.com/index.html \
                  $B/static/js/main.js $B/robots.txt arn:aws:s3:::accommodation/images/x.jpg arn:aws:s3:::any-other-bucket/x
aws iam simulate-principal-policy --policy-source-arn $R --profile domits --output json --query "$Q" \
  --action-names ssm:GetParameter \
  --resource-arns $A/aurora/dsql/region $A/aurora/dsql/host $A/aurora/dsql/dbName $A/aurora/dsql/schema \
                  $A/direct-booking-website/quote-token-secret $A/pricelabs/integration_token
aws iam simulate-principal-policy --policy-source-arn $R --profile domits --output json --query "$Q" \
  --action-names lambda:InvokeFunction \
  --resource-arns ${L}:PriceLabs-Integration ${L}:UnifiedMessaging ${L}:ChannelManagement ${L}:PropertyHandler
aws iam simulate-principal-policy --policy-source-arn $R --profile domits --output json --query "$Q" \
  --action-names dsql:DbConnectAdmin dsql:DbConnect dsql:DeleteCluster \
  --resource-arns arn:aws:dsql:eu-west-2:115462458880:cluster/6qabud3emiqhbfkh2h4ttwz35i
aws iam simulate-principal-policy --policy-source-arn $R --profile domits --output table \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' \
  --action-names cognito-idp:GetUser cognito-idp:AdminGetUser cloudfront:GetDistributionTenant cloudfront:CreateDistributionTenant \
                 cloudfront:VerifyDnsConfiguration cloudfront:ListDistributionTenants cloudfront:CreateInvalidationForDistributionTenant \
                 acm:DescribeCertificate acm:RequestCertificate logs:PutLogEvents dynamodb:GetItem
```

Expected per resource in the first call (with several resources the simulator reports under `perResource`, the top-level decision is a summary): `s3:GetObject` allowed on `index.html` and on the images key, implicitDeny elsewhere; `s3:PutObject` allowed on the `sites/by-host/` key and the images key, explicitDeny on `index.html`, `static/`, `robots.txt`, implicitDeny on the other bucket; `s3:DeleteObject` allowed on the `sites/by-host/` key (a withdrawn page is removed by its hostname key) and on the images key, explicitDeny on the shell and the assets. Second call: `ssm:GetParameter` allowed on the five named parameters and implicitDeny on `/pricelabs/integration_token`, which another function reads. Third call: `lambda:InvokeFunction` allowed on `PriceLabs-Integration` and `UnifiedMessaging`, implicitDeny on `ChannelManagement` and on `PropertyHandler` itself. Fourth call: `dsql:DbConnectAdmin` allowed on the cluster, `dsql:DbConnect` and `dsql:DeleteCluster` implicitDeny. Fifth call: every action `allowed`. Any other decision means a permission the function uses was not granted or not copied: stop, do not continue to step 3.

Rollback, harmless while nothing uses the role:

```bash
for p in property-handler-base static-page-writer custom-domains property-images; do
  aws iam delete-role-policy --role-name domits-property-handler --policy-name $p --profile domits
done
aws iam delete-role --role-name domits-property-handler --profile domits
```

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

Rollback: `aws iam delete-role-policy --role-name domits-static-page-worker-scheduler --policy-name invoke-property-handler --profile domits`, then `aws iam delete-role --role-name domits-static-page-worker-scheduler --profile domits`.

## 3. Switch `PropertyHandler` to its own role [CHANGES THE LIVE API]

Wait at least 15 seconds after step 1 so the role has propagated. From this moment every property request runs with the new role; the blast radius is `PropertyHandler` alone. A missing permission does not show on the function's `Errors` metric, because the handlers turn it into an HTTP 500, so the check is the log filter below, run after every action.

```bash
aws lambda update-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --role arn:aws:iam::115462458880:role/domits-property-handler --query '{role:Role,state:LastUpdateStatus}'
aws lambda wait function-updated --function-name PropertyHandler --profile domits --region eu-north-1
aws lambda invoke --function-name PropertyHandler --profile domits --region eu-north-1 --cli-binary-format raw-in-base64-out \
  --payload '{"httpMethod":"GET","resource":"/property/bookingEngine/{subResource}","pathParameters":{"subResource":"all"}}' /dev/stdout \
  | head -c 300; echo
```

Expected: `statusCode` 200 with property cards. That request reads SSM and DSQL with the new role. Then, logged in as a host on the acceptance web app, do each of these and run the log filter after each:

1. open the host dashboard property list (`GET /property/hostDashboard/all`: DSQL, Cognito);
2. upload a photo on one property and wait for it to appear (`POST /property/images/presign`, the browser's `PUT` to the presigned URL, `POST /property/images/confirm`: the images policy; a presign can succeed while the browser's `PUT` gets 403, so the photo must actually appear);
3. open one published direct booking site and request a quote for two nights (`POST /property/website/public/quote`: the quote token parameter);
4. block one date on that property's calendar and unblock it again (`PATCH /property/calendar/overrides`: this invokes the PriceLabs and the UnifiedMessaging functions; both swallow a failure into their own evidence, so the log filter is the only place an `AccessDenied` shows);
5. open the custom domain page of the website settings (`GET /property/website/domains`: CloudFront tenants and ACM).

```bash
aws logs filter-log-events --log-group-name /aws/lambda/PropertyHandler --profile domits --region eu-north-1 \
  --start-time $(( $(date +%s) * 1000 - 600000 )) --filter-pattern '"AccessDenied"' --query 'events[].message' --output text | head
```

Expected: nothing, after each action and again after ten minutes of real traffic. An `AccessDenied` here names the missing permission; roll back first, then add it to the role and repeat the simulator check.

Rollback, one command, then wait for the status; it usually takes seconds, allow a few minutes:

```bash
aws lambda update-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --role arn:aws:iam::115462458880:role/General-Lambda-Function --query Role
aws lambda wait function-updated --function-name PropertyHandler --profile domits --region eu-north-1
```

## 4. The bucket variable [CHANGES THE LIVE API CONFIGURATION]

`update-function-configuration --environment` replaces the whole variable set, so merge rather than retype:

`update-function-configuration --environment` replaces the whole variable set, so read the variables again right before the change (step 0's copy may be minutes old) and pass the `RevisionId` of that read, so a change made in between makes the update fail instead of being overwritten:

```bash
cd ~/static-page-worker-rollout
aws lambda get-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --query '{RevisionId:RevisionId,Variables:Environment.Variables}' > env-current.json
python3 -c 'import json; c=json.load(open("env-current.json")); v=dict(c["Variables"]); v["DIRECT_BOOKING_WEBSITE_SITES_BUCKET"]=__import__("os").environ["SITES_BUCKET"]; json.dump({"Variables": v}, open("env-after.json","w")); json.dump({"Variables": c["Variables"]}, open("env-restore.json","w")); print("revision", c["RevisionId"]); print("added:", sorted(set(v)-set(c["Variables"])), "changed:", [k for k in c["Variables"] if c["Variables"][k]!=v[k]])'
aws lambda update-function-configuration --function-name PropertyHandler --profile domits --region eu-north-1 \
  --revision-id "$(python3 -c 'import json; print(json.load(open("env-current.json"))["RevisionId"])')" \
  --environment file://env-after.json --query 'Environment.Variables' > env-now.json
aws lambda wait function-updated --function-name PropertyHandler --profile domits --region eu-north-1
python3 -c 'import json; a=json.load(open("env-after.json"))["Variables"]; b=json.load(open("env-now.json")); print("exactly as planned" if a==b else "DIFFERENT: "+str(sorted(set(a.items())^set(b.items()))))'
```

Expected: `added: ['DIRECT_BOOKING_WEBSITE_SITES_BUCKET'] changed: []`, then "exactly as planned". A `PreconditionFailedException` means the configuration changed between the read and the update: start the step again. Rollback: the same `update-function-configuration` with `--environment file://env-restore.json`, after a fresh read for a new `--revision-id`.

## 5. No asynchronous retries [CHANGES HOW A FAILED TASK RUN BEHAVES]

```bash
aws lambda get-function-event-invoke-config --function-name PropertyHandler --profile domits --region eu-north-1 2>&1 | tail -1
aws lambda put-function-event-invoke-config --function-name PropertyHandler --profile domits --region eu-north-1 \
  --maximum-retry-attempts 0 --maximum-event-age-in-seconds 60 \
  --query '{retries:MaximumRetryAttempts,age:MaximumEventAgeInSeconds,destinations:DestinationConfig}'
```

Expected: the first command answers `ResourceNotFoundException` (on 2026-10-01 the function has no asynchronous configuration, so the defaults of 2 retries and 6 hours apply and there are no destinations to preserve); if it answers with a configuration instead, save that output and carry its destinations into the `put`, because `put` replaces the whole configuration. The second answers `retries 0, age 60, destinations null`. This applies to asynchronous invocations only; API Gateway invokes synchronously and is unaffected. Step 0 showed API Gateway as the only resource-policy invoker; an IAM principal with `lambda:InvokeFunction` could still invoke asynchronously, and would from now on get no retries either, which is the intended behaviour for the task. Rollback: `aws lambda delete-function-event-invoke-config --function-name PropertyHandler --profile domits --region eu-north-1`, which restores the defaults recorded above.

## 6. One run by hand, one page [WRITES THE FIRST OBJECT TO S3]

```bash
cd ~/static-page-worker-rollout
aws lambda invoke --function-name PropertyHandler --profile domits --region eu-north-1 --cli-binary-format raw-in-base64-out \
  --payload '{"task":"build-static-pages","limit":1}' run-1.json --query '{status:StatusCode,error:FunctionError}'
cat run-1.json; echo
aws s3api list-objects-v2 --bucket $SITES_BUCKET --prefix sites/by-host/ --profile domits \
  --query 'Contents[].[Key,Size,LastModified]' --output text
aws s3api head-object --bucket $SITES_BUCKET --key index.html --profile domits \
  --query '{etag:ETag,modified:LastModified}' | diff shell-before.json - && echo "the shell is untouched"
```

Expected: `status 200`, no `FunctionError`, a body with `"built":1` (or `"listed":0` if no site has been republished since the migration; then publish one site from the dashboard and run again), one or two objects under `sites/by-host/<hostname>/index.html` of a few kilobytes, and "the shell is untouched". Read one page back and look at it:

```bash
K=$(aws s3api list-objects-v2 --bucket $SITES_BUCKET --prefix sites/by-host/ --profile domits --query 'Contents[0].Key' --output text)
aws s3api head-object --bucket $SITES_BUCKET --key "$K" --profile domits \
  --query '{type:ContentType,cache:CacheControl,meta:Metadata}'
aws s3 cp "s3://$SITES_BUCKET/$K" - --profile domits | grep -o '<title>[^<]*</title>\|<link rel="canonical"[^>]*>\|<meta name="robots"[^>]*>'
```

Expected: `text/html; charset=utf-8`, `public, max-age=300`, metadata `site-id` and `revision`, the site's title, a canonical on the site's **main address**, chosen with the rule of the public page (the flagged custom domain when it is live, otherwise the fallback; a site with a live flagged custom domain gets the same page under its fallback hostname, and that object carries the custom domain as canonical on purpose), `index, follow`. In the DSQL query editor, `SELECT site_id, revision, status, attempt_count, failure_reason FROM main.static_page_outbox ORDER BY updated_at DESC LIMIT 10;` shows that row `ACTIVE`.

A `FunctionError` here is the trigger rejecting. `run-1.json` then holds the counts; a page that was *not finished* (a status write that threw) is listed in `errors` with its site and message, while a page that *failed to build* is recorded on its outbox row, so read `failure_reason` from the query above: `RENDER_FAILED` means the bundle is missing from the package, `S3_PUT_FAILED` with `AccessDenied` means step 1 is wrong, `NO_ACTIVE_DOMAIN` means the fallback routing variable. Nothing is served from these objects before the edge change, so a wrong page costs nothing but the fix. Republishing a site from the dashboard to get a row to build does change that site: it rewrites its published snapshot from the current property data.

Rollback: the run changed two things, the objects and the outbox rows it marked `ACTIVE` (with their attempt count). Removing the objects alone would leave rows that say a page exists while none does, and the worker never looks at an `ACTIVE` row again until the next publish. So first the rows, in the query editor, with the site ids from the `list-objects-v2` output above (the `site-id` metadata on each object):

```sql
UPDATE main.static_page_outbox SET status = 'PENDING', attempt_count = 0, processed_at = NULL, updated_at = (EXTRACT(EPOCH FROM now()) * 1000)::bigint
WHERE site_id IN ('<site id 1>', '<site id 2>') AND status = 'ACTIVE';
```

Then the objects: `aws s3 rm s3://$SITES_BUCKET/sites/by-host/ --recursive --profile domits` (the bucket is versioned, so delete markers are written; that is enough, nothing routes to the key). With the rows back on `PENDING`, the next run rebuilds them, so do the rows only if the pages were wrong and the objects only if the pages must disappear.

## 7. The schedule, disabled

```bash
cd /path/to/Domits/backend/infrastructure/static-page-worker
aws scheduler create-schedule --profile domits --region eu-north-1 --cli-input-json file://schedule.json --query ScheduleArn
aws scheduler get-schedule --name domits-static-page-worker-rate-5-minutes --profile domits --region eu-north-1 \
  --query '{state:State,expr:ScheduleExpression,input:Target.Input,retry:Target.RetryPolicy,role:Target.RoleArn}'
```

Expected: `state DISABLED`, `rate(5 minutes)`, the task input with `limit 5`, `MaximumRetryAttempts 0`, the scheduler role from step 2. Nothing runs yet. Rollback: `aws scheduler delete-schedule --name domits-static-page-worker-rate-5-minutes --profile domits --region eu-north-1`.

## 8. The alarm

```bash
aws cloudwatch put-metric-alarm --profile domits --region eu-north-1 \
  --alarm-name PropertyHandler-static-page-run-failed \
  --alarm-description "A static page run failed or did not finish a page. Read the summary in the PropertyHandler log." \
  --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value=PropertyHandler \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching --alarm-actions arn:aws:sns:eu-north-1:115462458880:Alerts
aws cloudwatch put-metric-alarm --profile domits --region eu-north-1 \
  --alarm-name static-page-worker-schedule-not-delivered \
  --alarm-description "EventBridge Scheduler could not deliver or dropped a tick of the static page worker." \
  --namespace AWS/Scheduler --metric-name TargetErrorCount --dimensions Name=ScheduleGroup,Value=default \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching --alarm-actions arn:aws:sns:eu-north-1:115462458880:Alerts
aws cloudwatch describe-alarms --profile domits --region eu-north-1 \
  --alarm-names PropertyHandler-static-page-run-failed static-page-worker-schedule-not-delivered \
  --query 'MetricAlarms[].[AlarmName,StateValue,Threshold,Period,AlarmActions[0]]' --output text
```

Expected: both alarms with threshold `1.0`, period `300` and the `Alerts` topic as action; the state is `INSUFFICIENT_DATA` for the first minutes and `OK` after the first evaluation. The first alarm catches a run that rejected, crashed or timed out; the second catches a tick the scheduler could not deliver, which the first can never see. The `ScheduleGroup` dimension is shared with the other schedules in the `default` group, so a delivery failure of one of them raises it too; that is acceptable for an alarm that should be rare. `Alerts` is the existing topic with an HTTPS subscriber; check with the team that someone receives it. Rollback: `aws cloudwatch delete-alarms --alarm-names PropertyHandler-static-page-run-failed static-page-worker-schedule-not-delivered --profile domits --region eu-north-1`.

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
  --start-time $(python3 -c 'import datetime; print((datetime.datetime.utcnow()-datetime.timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ"))') \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) --query 'Datapoints[].[Timestamp,Sum]' --output text
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors --profile domits --region eu-north-1 \
  --dimensions Name=FunctionName,Value=PropertyHandler --statistics Sum --period 300 \
  --start-time $(python3 -c 'import datetime; print((datetime.datetime.utcnow()-datetime.timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ"))') \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) --query 'Datapoints[].[Timestamp,Sum]' --output text
aws logs filter-log-events --log-group-name /aws/lambda/PropertyHandler --profile domits --region eu-north-1 \
  --start-time $(( $(date +%s) * 1000 - 900000 )) --filter-pattern '?"static page run" ?"StaticPageWorker"' --query 'events[].message' --output text | tail -5
```

The invocation count includes the normal API traffic, so it only shows that the function was called; the signals that belong to the worker are the `Errors` sum (expected: no datapoint above 0), the log filter (expected: no line; a rejected run logs `The static page run left ...`, an unexpected error logs `[StaticPageWorker]`), and the outbox query from step 6 (expected: rows moving to `ACTIVE`, none `FAILED` with a reason, none `BUILDING` longer than a run).

Rollback, in this order:

```bash
cd /path/to/Domits/backend/infrastructure/static-page-worker
aws scheduler update-schedule --profile domits --region eu-north-1 --cli-input-json file://schedule.json --query ScheduleArn
aws scheduler get-schedule --name domits-static-page-worker-rate-5-minutes --profile domits --region eu-north-1 --query State
```

`schedule.json` carries `State: DISABLED`, so this stops new ticks; expected `DISABLED`. A run that was already accepted finishes on its own within the 30 second timeout, so wait one minute and confirm with the outbox query that no row is `BUILDING` before touching anything else. Then step 6's rows and objects only if the pages must go, and steps 5, 4 and 3 in reverse only if the role or the configuration is the problem. Disabling the schedule is enough for every failure that is not an `AccessDenied` on the API.

## What it costs per month

Prices for eu-north-1, list, rounded up. The idle polling dominates; the pages themselves are almost free.

| Item | 9 sites | 1000 sites |
| --- | --- | --- |
| EventBridge Scheduler, 8,640 ticks | $0.01 | $0.01 |
| Lambda, 8,640 runs that find nothing, about 0.3 s at 1 GB | $0.05 | $0.05 |
| DSQL, one indexed read per empty run, assumed 1 DPU each at $8 per million | about $0.07 | about $0.07 |
| Lambda plus DSQL plus S3 per built page, about 1 s and ten statements, assumed 10 DPU | under $0.01 for a few republishes | under $0.01 after the first fill |
| S3 storage, about 9 KB per page | $0.00 | $0.00 |
| Two CloudWatch alarms | $0.20 | $0.20 |
| **Every month** | **about $0.35** | **about $0.35** |
| **Once, the first fill of 1000 pages** | | **about $0.10** |

The DPU figures are assumptions, not measurements; DSQL bills compute and bytes, and the first week of the schedule will show the real number on the cluster's billing page. Halving the rate halves the first three lines. A thousand queued sites take about 17 hours at five pages every five minutes; raise `limit` in the schedule input to 10 for a faster first fill, never above the number of pages that fit in the 30 second timeout (about one second each).
