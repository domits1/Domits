# Static page edge function: pick the page per hostname (2026-10-05)

Runbook for putting `backend/infrastructure/static-page-edge/viewer-request.js` in front of the direct booking sites distribution `E18TUBOKUXD9TW`. The function is checked by `backend/test/infrastructure/staticPageEdgeFunction.test.js` against `cases.json` next to it; the same cases are replayed below with `aws cloudfront test-function` before anything is published. Nothing in the repository applies any of it; every step is run by hand, in this order, with `--profile domits`, and CloudFront commands with `--region us-east-1` (CloudFront is a global service that the CLI addresses there), S3 commands with `--region eu-north-1`.

Run it only after the worker has written at least one page under `sites/by-host/` in the sites bucket, so that step 5 has something to check. Until step 5 no visitor is affected: steps 1 to 4 create a function nobody uses and a throwaway distribution nobody points a domain at.

## What this changes, and why it is shaped this way

- **One viewer-request function on the default cache behaviour.** Every request to every tenant of the distribution passes through it. It rewrites exactly two URIs, `/` and `/index.html`, and only for `GET` and `HEAD`, to `/sites/by-host/<hostname>/index.html`. Everything else (hashed assets under `static/`, `robots.txt`, `sitemap.xml`, `favicon.ico`, the preview and dashboard routes, any other path, any other method) leaves the function untouched. The allowlist is the safety: the function cannot touch an asset even by accident, because it never rewrites a URI with a dot or a path segment.
- **The hostname comes from the request, so it is normalised and checked before it becomes a key.** Lower case, the port stripped, a trailing dot stripped, surrounding spaces stripped. Then the same rule the store applies when it writes a page: at least two labels, each `[a-z0-9]` with hyphens inside, at most 63 characters, the whole name at most 253. A host header that fails that rule (missing, empty, a slash, two dots in a row, a single label, an IPv6 literal, a non-ASCII letter, an underscore) leaves the request untouched, so no key can ever contain a path separator or anything the store would not have written.
- **A site without a page keeps today's behaviour, without code.** The rewritten key does not exist, S3 answers 403 through the origin access control, and the distribution's existing custom error responses (403 and 404 to `/index.html` with status 200) serve the app shell. That response is cached for `ErrorCachingMinTTL`, 10 seconds on this distribution, so a page that the worker writes shows up within 10 seconds. A withdrawn page (deleted object) falls back the same way once its own `Cache-Control: public, max-age=300` has run out.
- **One site can never get another site's page.** The cache key is the URI after the function ran, and the hostname is part of that URI. The cache policy stays the managed `CachingOptimized`; it does not need the `Host` header in the key, because the path already carries it. Paths that are not rewritten stay shared across hosts, which is right: the assets are the same for every site.
- **A bug in the function would hit every site at once, so the function cannot throw.** The whole body sits in one `try`, and the `catch` returns the request unchanged; CloudFront would otherwise answer 503 for every request to every tenant. The source is under 10 KB, uses no `import`, `require`, network or timers (the test pins all four), compiles in the restricted runtime, and the 28 cases in `cases.json` are run in the unit test and again with `test-function` on the real runtime, including the inputs that must leave the request alone.
- **`www.domits.com` and `acceptance.domits.com` are not on this distribution.** They are served by Amplify through another CloudFront distribution; this function is attached to `E18TUBOKUXD9TW` only. The one hand-made tenant on it, `developers-test` (`developers.domits.com`), also gets the rewrite, has no page object, and so keeps getting the shell exactly as today.
- **Considered and rejected: a KeyValueStore or a per-tenant parameter.** The design document (`SEO phase 2`, point 3) settles on keys by hostname: no lookup, no second source of truth, and a moved domain is owned by whoever wrote the key last. The wildcard tenant holds many sites with one parameter set, so a tenant parameter could not tell them apart.

## What happens if it goes wrong

| Case | What a visitor sees | What to do |
| --- | --- | --- |
| the function throws on some input | 503 on that request only, for every tenant that sends that input | cannot happen for the inputs in `cases.json`; for anything else the `catch` returns the request. Step 2 proves it on the real runtime |
| the rewrite points at a key that does not exist | the app shell, as today, cached 10 seconds | nothing; that is the designed fallback |
| a page is wrong | that site shows the wrong page until the worker overwrites the object (`max-age=300`) | fix the worker, or delete the object and invalidate `/sites/by-host/<hostname>/index.html` on the site's tenant: the shell comes back at once, or within 300 seconds without the invalidation |
| the function is attached and everything must go back | nothing visible during the rollback | step 5's rollback: one `update-distribution` without the association; the keys under `sites/by-host/` are simply not used any more |

## 0. Preconditions, read-only

```bash
aws cloudfront get-distribution-config --id E18TUBOKUXD9TW --profile domits --region us-east-1 \
  --query 'DistributionConfig.{connection:ConnectionMode,functions:DefaultCacheBehavior.FunctionAssociations.Quantity,lambda:DefaultCacheBehavior.LambdaFunctionAssociations.Quantity,cache:DefaultCacheBehavior.CachePolicyId,errors:CustomErrorResponses.Items[].[ErrorCode,ResponsePagePath,ResponseCode,ErrorCachingMinTTL],root:DefaultRootObject}'
aws cloudfront list-functions --profile domits --region us-east-1 --query 'FunctionList.Items[].[Name,FunctionMetadata.Stage]' --output text
aws cloudfront list-distribution-tenants --profile domits --region us-east-1 \
  --association-filter DistributionId=E18TUBOKUXD9TW --query 'DistributionTenantList[].[Name,Enabled,join(`,`,Domains[].Domain)]' --output text | cut -c1-160
aws s3 ls s3://domits-direct-booking-sites-acceptance/sites/by-host/ --profile domits --region eu-north-1 | head
```

Expected: `tenant-only`, `functions 0`, `lambda 0`, cache policy `658327ea-f89d-4fab-a63d-7e88639e58f6` (the managed `CachingOptimized`), errors `403 /index.html 200 10` and `404 /index.html 200 10`, root `index.html`; no function listed yet (on 2026-10-05 the account has none); three tenants, `test-direct` carrying `*.direct.domits.com`; and at least one `PRE <hostname>/` under `sites/by-host/`. Write down one hostname that has a page and one that has none; step 5 checks both. If `functions` is not `0`, stop: another function is already attached and this runbook assumes none.

## 1. Create the function, DEVELOPMENT stage only

```bash
cd /path/to/Domits/backend/infrastructure/static-page-edge
aws cloudfront create-function --name domits-static-page-by-host --profile domits --region us-east-1 \
  --function-config '{"Comment":"Rewrites / and /index.html to the static page of the requested hostname","Runtime":"cloudfront-js-2.0"}' \
  --function-code fileb://viewer-request.js \
  --query '{arn:FunctionSummary.FunctionMetadata.FunctionARN,stage:FunctionSummary.FunctionMetadata.Stage,status:FunctionSummary.Status}'
aws cloudfront describe-function --name domits-static-page-by-host --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text
```

Expected: ARN `arn:aws:cloudfront::115462458880:function/domits-static-page-by-host`, stage `DEVELOPMENT`, status `UNPUBLISHED`, and an ETag (keep it; every later call on the function needs the current one). Nothing uses the function yet.

Rollback: `aws cloudfront delete-function --name domits-static-page-by-host --if-match "$(aws cloudfront describe-function --name domits-static-page-by-host --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text)" --profile domits --region us-east-1`.

## 2. Replay every case on the real runtime

The unit test ran the source in Node. This runs it in CloudFront's own runtime, one case at a time, and compares the URI it returns with the one the test expected.

```bash
cd /path/to/Domits/backend/infrastructure/static-page-edge
ETAG=$(aws cloudfront describe-function --name domits-static-page-by-host --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text)
failures=0
for i in $(seq 0 $(( $(jq length cases.json) - 1 ))); do
  jq -c ".[$i] | {version:\"1.0\",context:{eventType:\"viewer-request\"},viewer:{ip:\"203.0.113.1\"},request:{method:.method,uri:.uri,querystring:(.querystring // {}),headers:(if .host == null then {} else {host:{value:.host}} end),cookies:{}}}" cases.json > /tmp/edge-event.json
  expected=$(jq -r ".[$i].expectedUri" cases.json)
  result=$(aws cloudfront test-function --name domits-static-page-by-host --stage DEVELOPMENT --if-match "$ETAG" --profile domits --region us-east-1 \
    --event-object fileb:///tmp/edge-event.json --query 'TestResult.{uri:FunctionOutput,error:FunctionErrorMessage,cpu:ComputeUtilization}' --output json)
  actual=$(echo "$result" | jq -r '.uri | fromjson | .request.uri')
  error=$(echo "$result" | jq -r '.error // empty')
  cpu=$(echo "$result" | jq -r '.cpu')
  if [ "$actual" != "$expected" ] || [ -n "$error" ]; then failures=$((failures + 1)); echo "FAIL $(jq -r ".[$i].name" cases.json): got '$actual' expected '$expected' error '$error'"; fi
  echo "$cpu $(jq -r ".[$i].name" cases.json): $actual"
done
echo "failures: $failures"
```

Expected: `failures: 0`, no `FunctionErrorMessage` on any case, and a compute utilization well under 100 (a two-digit number; the limit that matters is the runtime's one millisecond, which this function does not come near). Any failure means the runtime behaves differently from Node for that input: stop, fix the function, `update-function` with the new code and the current ETag, and run this step again.

Rollback: none needed, nothing changed.

## 3. Publish to LIVE

A function can only be attached to a distribution from its LIVE stage. Publishing changes nothing a visitor sees until a distribution references it.

```bash
ETAG=$(aws cloudfront describe-function --name domits-static-page-by-host --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text)
aws cloudfront publish-function --name domits-static-page-by-host --if-match "$ETAG" --profile domits --region us-east-1 \
  --query '{stage:FunctionSummary.FunctionMetadata.Stage,arn:FunctionSummary.FunctionMetadata.FunctionARN}'
```

Expected: stage `LIVE`. Rollback: there is no unpublish; a published function that nothing references is inert, and step 1's rollback deletes it.

## 4. Rehearsal on a throwaway distribution, run during the day

This proves the attached function on a real distribution with the real cache policy and the real error responses, without touching `E18TUBOKUXD9TW`. It uses its own bucket, so it cannot read or write a real page. Allow 20 minutes; a distribution takes several minutes to deploy and several to disable.

```bash
mkdir -p ~/static-page-edge-rehearsal && cd ~/static-page-edge-rehearsal
export SITES_BUCKET=domits-direct-booking-sites-acceptance
export REHEARSAL_BUCKET=domits-static-page-edge-rehearsal
aws s3 mb s3://$REHEARSAL_BUCKET --profile domits --region eu-north-1
aws s3api put-public-access-block --bucket $REHEARSAL_BUCKET --profile domits --region eu-north-1 \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3 cp s3://$SITES_BUCKET/index.html s3://$REHEARSAL_BUCKET/index.html --profile domits --region eu-north-1 \
  --content-type "text/html; charset=utf-8" --cache-control "no-cache, no-store, must-revalidate" --metadata-directive REPLACE
printf 'User-agent: *\nDisallow: /rehearsal\n' | aws s3 cp - s3://$REHEARSAL_BUCKET/robots.txt --profile domits --region eu-north-1 --content-type text/plain
printf 'console.log("probe")\n' | aws s3 cp - s3://$REHEARSAL_BUCKET/static/js/probe.js --profile domits --region eu-north-1 --content-type application/javascript
OAC_ID=$(aws cloudfront create-origin-access-control --profile domits --region us-east-1 \
  --origin-access-control-config Name=oac-static-page-edge-rehearsal,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3 \
  --query OriginAccessControl.Id --output text); echo "$OAC_ID"
cat > distribution.json <<EOF
{
  "CallerReference": "static-page-edge-rehearsal-$(date +%s)",
  "Comment": "static page edge function rehearsal, delete after use",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "HttpVersion": "http2",
  "Origins": {"Quantity": 1, "Items": [{"Id": "rehearsal-bucket", "DomainName": "$REHEARSAL_BUCKET.s3.eu-north-1.amazonaws.com", "OriginAccessControlId": "$OAC_ID", "S3OriginConfig": {"OriginAccessIdentity": ""}}]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "rehearsal-bucket",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}},
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "FunctionAssociations": {"Quantity": 1, "Items": [{"FunctionARN": "arn:aws:cloudfront::115462458880:function/domits-static-page-by-host", "EventType": "viewer-request"}]}
  },
  "CustomErrorResponses": {"Quantity": 2, "Items": [
    {"ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10},
    {"ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10}
  ]}
}
EOF
aws cloudfront create-distribution --distribution-config file://distribution.json --profile domits --region us-east-1 \
  --query 'Distribution.{id:Id,domain:DomainName,arn:ARN,status:Status}' > distribution-created.json; cat distribution-created.json
DIST_ID=$(jq -r .id distribution-created.json); DIST_DOMAIN=$(jq -r .domain distribution-created.json); DIST_ARN=$(jq -r .arn distribution-created.json)
cat > bucket-policy.json <<EOF
{"Version":"2012-10-17","Statement":[{"Sid":"AllowRehearsalDistribution","Effect":"Allow","Principal":{"Service":"cloudfront.amazonaws.com"},"Action":"s3:GetObject","Resource":"arn:aws:s3:::$REHEARSAL_BUCKET/*","Condition":{"ArnLike":{"AWS:SourceArn":"$DIST_ARN"}}}]}
EOF
aws s3api put-bucket-policy --bucket $REHEARSAL_BUCKET --policy file://bucket-policy.json --profile domits --region eu-north-1
printf '<!doctype html><html><head><title>rehearsal page for %s</title><link rel="canonical" href="https://%s/"></head><body>static page</body></html>\n' "$DIST_DOMAIN" "$DIST_DOMAIN" \
  | aws s3 cp - "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region eu-north-1 \
    --content-type "text/html; charset=utf-8" --cache-control "public, max-age=300"
aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile domits --region us-east-1; echo deployed
```

Expected: the bucket, the OAC and the distribution exist, `status` `InProgress` at creation and `deployed` after the wait. The page object is keyed by the distribution's own domain name, because that is the only hostname a distribution without alternate domain names answers to, so the function sees `Host: $DIST_DOMAIN` and rewrites to exactly that key.

Now the checks, each one line, each with its expected output:

```bash
curl -s "https://$DIST_DOMAIN/" | grep -o "<title>[^<]*</title>"
curl -s "https://$DIST_DOMAIN/index.html" | grep -o "<title>[^<]*</title>"
curl -s "https://$DIST_DOMAIN/?utm_source=mail" | grep -o "<title>[^<]*</title>"
curl -sI "https://$DIST_DOMAIN/" | grep -i "^HTTP\|^content-type\|^cache-control\|^x-cache"
curl -s "https://$DIST_DOMAIN/robots.txt"
curl -s "https://$DIST_DOMAIN/static/js/probe.js"
curl -s "https://$DIST_DOMAIN/hostdashboard" | grep -c "You need to enable JavaScript"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://$DIST_DOMAIN/"
aws s3 rm "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region eu-north-1
INV_ID=$(aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region us-east-1 --query Invalidation.Id --output text)
aws cloudfront wait invalidation-completed --distribution-id "$DIST_ID" --id "$INV_ID" --profile domits --region us-east-1
curl -s "https://$DIST_DOMAIN/" | grep -c "You need to enable JavaScript"
```

Expected, in order: `<title>rehearsal page for <domain></title>` three times (root, `/index.html`, root with a query string); a `HTTP/2 200` with `content-type: text/html; charset=utf-8`, `cache-control: public, max-age=300` and an `x-cache` header; the two robots lines; `console.log("probe")`; `1` (any app route gets the shell, through the 404 error response); `403` for the POST (S3 refuses it, the function did not rewrite it, and 403 maps to the shell with status 200 only for `GET`; if you see `200` here, CloudFront served the error page for the POST, which is also harmless); and after the delete and the invalidation, `1`: the page is gone and the shell is back. The invalidation names the rewritten key, not `/`, because that is the key the edge cached the page under; without it the page would stay for its `max-age=300`. A `503` anywhere means the function failed on the real distribution: stop, read `aws cloudfront describe-function --name domits-static-page-by-host --stage LIVE`, and do not continue to step 5. The first `curl` of `/` right after the deploy can still answer the shell for up to 10 seconds if an edge cached the miss before the object landed; run it again.

Cleanup, always, even when a check failed (nothing here touches the real distribution or bucket):

```bash
cd ~/static-page-edge-rehearsal
aws cloudfront get-distribution-config --id "$DIST_ID" --profile domits --region us-east-1 > rehearsal-config.json
jq '.DistributionConfig | .Enabled = false' rehearsal-config.json > rehearsal-disabled.json
aws cloudfront update-distribution --id "$DIST_ID" --if-match "$(jq -r .ETag rehearsal-config.json)" --distribution-config file://rehearsal-disabled.json \
  --profile domits --region us-east-1 --query 'Distribution.DistributionConfig.Enabled'
aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile domits --region us-east-1
aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$(aws cloudfront get-distribution-config --id "$DIST_ID" --profile domits --region us-east-1 --query ETag --output text)" --profile domits --region us-east-1
aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$(aws cloudfront get-origin-access-control --id "$OAC_ID" --profile domits --region us-east-1 --query ETag --output text)" --profile domits --region us-east-1
aws s3 rm "s3://$REHEARSAL_BUCKET" --recursive --profile domits --region eu-north-1
aws s3 rb "s3://$REHEARSAL_BUCKET" --profile domits --region eu-north-1
aws cloudfront list-distributions --profile domits --region us-east-1 --query 'DistributionList.Items[].[Id,Comment]' --output text
```

Expected: `false`, the wait returns, both deletes succeed, the bucket is gone, and the final list shows only the two existing distributions (`E1B9FQOMI0Y9N` and `E18TUBOKUXD9TW`). The OAC delete can answer `OriginAccessControlInUse` for a minute after the distribution delete; run it again.

## 5. Attach the function to the sites distribution [CHANGES WHAT EVERY HOST SITE SERVES]

Only after step 4 passed and the cleanup ran. Read the configuration right before the change and pass its ETag, so a change made in between makes the update fail instead of being overwritten.

```bash
mkdir -p ~/static-page-edge-rollout && cd ~/static-page-edge-rollout
aws cloudfront get-distribution-config --id E18TUBOKUXD9TW --profile domits --region us-east-1 > before.json
jq '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations' before.json
jq '.DistributionConfig | .DefaultCacheBehavior.FunctionAssociations = {"Quantity": 1, "Items": [{"FunctionARN": "arn:aws:cloudfront::115462458880:function/domits-static-page-by-host", "EventType": "viewer-request"}]}' before.json > after.json
diff <(jq -S .DistributionConfig before.json) <(jq -S . after.json)
aws cloudfront update-distribution --id E18TUBOKUXD9TW --if-match "$(jq -r .ETag before.json)" --distribution-config file://after.json \
  --profile domits --region us-east-1 --query 'Distribution.{status:Status,functions:DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[].FunctionARN}'
aws cloudfront wait distribution-deployed --id E18TUBOKUXD9TW --profile domits --region us-east-1; echo deployed
```

Expected: `{"Quantity": 0}` before; the `diff` shows only the `FunctionAssociations` block; the update answers `InProgress` with the function ARN; `deployed` after the wait. A `PreconditionFailed` means the distribution changed between the read and the update: start the step again from the read.

Checks, with `WITH` a hostname that has a page under `sites/by-host/` and `WITHOUT` one that has none (both from step 0):

```bash
WITH=<hostname with a page>; WITHOUT=<hostname without a page>
curl -s "https://$WITH/" | grep -o '<link rel="canonical"[^>]*>\|<title>[^<]*</title>'
curl -sI "https://$WITH/" | grep -i "^HTTP\|^cache-control\|^x-cache"
curl -s "https://$WITHOUT/" | grep -c "You need to enable JavaScript"
curl -s "https://$WITH/robots.txt" | head -3
curl -s -o /dev/null -w "%{http_code}\n" "https://$WITH/$(curl -s "https://$WITHOUT/" | grep -o 'static/js/main\.[a-z0-9]*\.js' | head -1)"
curl -s "https://www.domits.com/about" | grep -o '<link rel="canonical"[^>]*>'
curl -s "https://www.domits.com/" | grep -c "You need to enable JavaScript"
```

Expected: the site's own `<title>` and a canonical on its main address; `HTTP/2 200` with `cache-control: public, max-age=300`; `1` for the site without a page (shell, as today); the host site's own `robots.txt`; `200` for a hashed asset; and `www.domits.com` exactly as before this step (its canonical, and its shell count `1`, come from Amplify, which this function never touches). Then watch for ten minutes:

```bash
aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name FunctionValidationErrors --profile domits --region us-east-1 \
  --dimensions Name=FunctionName,Value=domits-static-page-by-host Name=Region,Value=Global --statistics Sum --period 300 \
  --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --query 'Datapoints[].Sum' --output text
aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name FunctionExecutionErrors --profile domits --region us-east-1 \
  --dimensions Name=FunctionName,Value=domits-static-page-by-host Name=Region,Value=Global --statistics Sum --period 300 \
  --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --query 'Datapoints[].Sum' --output text
```

Expected: no datapoint, or only `0.0`. Any other number is a request the function failed or returned something invalid for: roll back first, then look at `cases.json` for the input that is missing.

Rollback, one read and one update, then the wait:

```bash
cd ~/static-page-edge-rollout
aws cloudfront get-distribution-config --id E18TUBOKUXD9TW --profile domits --region us-east-1 > current.json
jq '.DistributionConfig | .DefaultCacheBehavior.FunctionAssociations = {"Quantity": 0}' current.json > rollback.json
aws cloudfront update-distribution --id E18TUBOKUXD9TW --if-match "$(jq -r .ETag current.json)" --distribution-config file://rollback.json \
  --profile domits --region us-east-1 --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Quantity'
aws cloudfront wait distribution-deployed --id E18TUBOKUXD9TW --profile domits --region us-east-1
```

Expected: `0`, then the wait. No invalidation is needed: without the rewrite the cache key for `/` is `/` again, which still holds the shell, and the cached pages under `sites/by-host/` are simply never asked for. The function itself stays published and unused; delete it with step 1's rollback once nothing references it.

## For the pull requests that come after this one

- **Invalidating a page.** The cache key of a site's page is the rewritten URI, so the worker or the withdrawal step invalidates `/sites/by-host/<hostname>/index.html` on the tenant that owns the hostname (`aws cloudfront create-invalidation-for-distribution-tenant --id <tenant id>`), the way `deploy-direct-booking-sites.yml` already invalidates the shared files. Invalidating `/` alone does not reach the page. Without any invalidation a new page is visible within `max-age=300`, and a page for a hostname that had none within 10 seconds.
- **The shell deploy.** `deploy-direct-booking-sites.yml` invalidates `/index.html` and `/` on every tenant; with the function attached those keys only serve sites without a page. Sites with a page keep serving their rendered copy until the worker regenerates it after a frontend deploy (PR 11 in the design), which is the intended behaviour: a rendered page references its own hashed assets, which the deploy leaves in place.

## What it costs

CloudFront Functions bill per invocation, about $0.10 per million, and the function runs on every request to every tenant, assets included. Nine sites with a few thousand requests a day each is a few hundred thousand invocations a month: a few cents.
