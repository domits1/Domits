# Static page edge function: pick the page per hostname (2026-10-05)

Runbook for putting `backend/infrastructure/static-page-edge/viewer-request.js` in front of the direct booking sites distribution `E18TUBOKUXD9TW`. The function is checked by `backend/test/infrastructure/staticPageEdgeFunction.test.js` against `cases.json` next to it; the same cases are replayed below with `aws cloudfront test-function` before anything is published. Nothing in the repository applies any of it; every step is run by hand, in this order, with `--profile domits`, and CloudFront commands with `--region us-east-1` (CloudFront is a global service that the CLI addresses there), S3 commands with `--region eu-north-1`.

Run it only after the worker has written at least one page under `sites/by-host/` in the sites bucket, so that step 5 has something to check. Until step 5 no visitor is affected: steps 1 to 4 create a function nobody uses and a throwaway distribution nobody points a domain at.

## What this changes, and why it is shaped this way

- **One viewer-request function on the default cache behaviour.** Every request to every tenant of the distribution passes through it. It rewrites exactly two URIs, `/` and `/index.html`, and only for `GET` and `HEAD`, to `/sites/by-host/<hostname>/index.html`. Everything else (hashed assets under `static/`, `robots.txt`, `sitemap.xml`, `favicon.ico`, the preview and dashboard routes, any other path, any other method) leaves the function untouched. The allowlist is the safety: the function cannot touch an asset even by accident, because it never rewrites a URI with a dot or a path segment. One path is refused rather than passed through: a direct request to `/sites/by-host/...` answers 404 from the function, so the only way to reach a page is through its own hostname and nobody can read another site's page under their domain.
- **The hostname comes from the request, so it is normalised and checked before it becomes a key.** Lower case, surrounding spaces and a trailing dot stripped, and a port accepted only when it is one to five digits. Then the same rule the store applies when it writes a page: at least two labels, each `[a-z0-9]` with hyphens inside, at most 63 characters, the whole name at most 253. A host header that fails that rule (missing, empty, two values, a port that is not a number, two colons, a comma, a slash, two dots in a row, a single label, an IPv6 literal, a non-ASCII letter, an underscore, a percent escape) leaves the request untouched, so no key can ever contain a path separator or anything the store would not have written. A rewrite that would push the URI plus its query string past the runtime's 8192 character limit is skipped too, so a request with an enormous query string gets the shell instead of a validation error.
- **A site without a page keeps today's behaviour, without code.** The rewritten key does not exist, S3 answers 403 through the origin access control, and the distribution's existing custom error responses (403 and 404 to `/index.html` with status 200) serve the app shell. The edge caches that miss for `ErrorCachingMinTTL`, 10 seconds on this distribution, so an edge that served the shell asks S3 again at most 10 seconds after the worker wrote the page. A page that was served is cached by the edge and by the browser for its own `Cache-Control: public, max-age=300`; an invalidation clears the edge, never a browser that already holds the page.
- **The cache cannot hand one site another site's page.** The cache key is the URI after the function ran, and the hostname is part of that URI. The cache policy stays the managed `CachingOptimized`; it does not need the `Host` header in the key, because the path already carries it. Paths that are not rewritten stay shared across hosts, which is right: the assets are the same for every site. The 404 on direct `/sites/by-host/` requests closes the other road to another site's page: the key namespace is reachable only through the rewrite.
- **A bug in the function would hit every site at once, so the function must not throw.** Everything after the event is read sits in one `try`, and the `catch` returns the request unchanged; a thrown error would otherwise cost the viewer a 503, and a returned request CloudFront cannot validate a 502. The source is under 10 KB, uses no `import`, `require`, network or timers (the test pins all of them), compiles in the restricted runtime, and the 44 cases in `cases.json` are run in the unit test and again with `test-function` on the real runtime, including the inputs that must leave the request alone. What that cannot prove: the runtime's compute limit under real load, which is why step 5 reads the function's own CloudWatch metrics.
- **`www.domits.com` and `acceptance.domits.com` are not on this distribution.** They are served by Amplify through another CloudFront distribution; this function is attached to `E18TUBOKUXD9TW` only. The one hand-made tenant on it, `developers-test` (`developers.domits.com`), also gets the rewrite, has no page object, and so keeps getting the shell exactly as today.
- **Considered and rejected: a KeyValueStore or a per-tenant parameter.** The design document (`SEO phase 2`, point 3) settles on keys by hostname: no lookup, no second source of truth, and a moved domain is owned by whoever wrote the key last. The wildcard tenant holds many sites with one parameter set, so a tenant parameter could not tell them apart.

## What happens if it goes wrong

| Case | What a visitor sees | What to do |
| --- | --- | --- |
| the function throws on some input | 503 on that request only, for every tenant that sends that input | cannot happen for the inputs in `cases.json`; for anything else the `catch` returns the request. Step 2 proves it on the real runtime |
| the rewrite points at a key that does not exist | the app shell, as today, cached 10 seconds | nothing; that is the designed fallback |
| a page is wrong | that site shows the wrong page until the worker overwrites the object (`max-age=300`) | fix the worker, or delete the object and invalidate `/sites/by-host/<hostname>/index.html` on the site's tenant: the shell comes back at once, or within 300 seconds without the invalidation |
| the function is attached and everything must go back | nothing new during the minutes the rollback propagates; a browser keeps a page it already holds for up to 300 seconds | step 5's rollback: one `update-distribution` without this association; the keys under `sites/by-host/` are simply not used any more |

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

Expected: `failures: 0`, no `FunctionErrorMessage` on any case, and a compute utilization well under 100 (a one or two digit number; the limit that matters is the runtime's one millisecond, which this function does not come near). Any failure means the runtime behaves differently from Node for that input: stop, fix the function, `update-function` with the new code and the current ETag, and run this step again. What this step does not exercise: the `catch`, because the replay feeds the function well-formed events only.

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
aws cloudfront create-distribution --distribution-config file://distribution.json --profile domits --region us-east-1 --output json \
  --query 'Distribution.{id:Id,domain:DomainName,arn:ARN,status:Status}' > distribution-created.json; cat distribution-created.json
DIST_ID=$(jq -r .id distribution-created.json); DIST_DOMAIN=$(jq -r .domain distribution-created.json); DIST_ARN=$(jq -r .arn distribution-created.json)
cat > bucket-policy.json <<EOF
{"Version":"2012-10-17","Statement":[{"Sid":"AllowRehearsalDistribution","Effect":"Allow","Principal":{"Service":"cloudfront.amazonaws.com"},"Action":"s3:GetObject","Resource":"arn:aws:s3:::$REHEARSAL_BUCKET/*","Condition":{"ArnLike":{"AWS:SourceArn":"$DIST_ARN"}}}]}
EOF
aws s3api put-bucket-policy --bucket $REHEARSAL_BUCKET --policy file://bucket-policy.json --profile domits --region eu-north-1
printf '<!doctype html><html><head><title>rehearsal page for %s</title><link rel="canonical" href="https://%s/"></head><body>static page</body></html>\n' "$DIST_DOMAIN" "$DIST_DOMAIN" \
  | aws s3 cp - "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region eu-north-1 \
    --content-type "text/html; charset=utf-8" --cache-control "public, max-age=300"
aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile domits --region us-east-1 && echo deployed
```

Expected: the bucket, the OAC and the distribution exist, `status` `InProgress` at creation and `deployed` after the wait. The page object is keyed by the distribution's own domain name, because that is the only hostname a distribution without alternate domain names answers to, so the function sees `Host: $DIST_DOMAIN` and rewrites to exactly that key.

Now the checks, each one line, each with its expected output:

```bash
curl -s "https://$DIST_DOMAIN/" | grep -o "<title>[^<]*</title>"
curl -s "https://$DIST_DOMAIN/index.html" | grep -o "<title>[^<]*</title>"
curl -s "https://$DIST_DOMAIN/?utm_source=mail" | grep -o "<title>[^<]*</title>"
curl -sI "https://$DIST_DOMAIN/" | grep -i "^HTTP\|^content-type\|^cache-control\|^x-cache"
curl -s "https://$DIST_DOMAIN/robots.txt"
curl -sI "https://$DIST_DOMAIN/static/js/probe.js" | grep -i "^HTTP\|^content-type"
curl -s "https://$DIST_DOMAIN/hostdashboard" | grep -c "You need to enable JavaScript"
curl -s -o /dev/null -w "%{http_code}\n" "https://$DIST_DOMAIN/sites/by-host/$DIST_DOMAIN/index.html"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://$DIST_DOMAIN/"
aws s3 rm "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region eu-north-1
INV_ID=$(aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region us-east-1 --query Invalidation.Id --output text)
aws cloudfront wait invalidation-completed --distribution-id "$DIST_ID" --id "$INV_ID" --profile domits --region us-east-1
curl -s "https://$DIST_DOMAIN/" | grep -c "You need to enable JavaScript"
```

Expected, in order: `<title>rehearsal page for <domain></title>` three times (root, `/index.html`, root with a query string); a `HTTP/2 200` with `content-type: text/html; charset=utf-8`, `cache-control: public, max-age=300` and an `x-cache` header; the two robots lines; `HTTP/2 200` with `content-type: application/javascript` for the asset (a shell served in its place would say `text/html`, which is why the status alone is not enough); `1` (any app route gets the shell: the key is missing, S3 answers 403 through the origin access control, and the 403 error response serves the shell); `404` for the direct request to a page key, which the function refuses; `403` for the POST (CloudFront refuses a method outside `AllowedMethods` before any origin is asked, and the function never rewrote it; if a `200` shows up here, the error response turned that 403 into the shell, which is also harmless); and after the delete and the invalidation, `1`: the page is gone and the shell is back. The invalidation names the rewritten key, because that is the key the edge cached the page under; without it the page would stay at the edge for its `max-age=300`, and a browser that already holds it keeps it for the same time whatever is invalidated. A `503` or `502` anywhere means the function failed or returned something CloudFront could not validate: stop, read the two function metrics from step 5 for this distribution (`$DIST_ID`), and do not continue to step 5. The first `curl` of `/` right after the deploy can still answer the shell for up to 10 seconds if an edge cached the miss before the object landed; run it again.

Then rehearse the rollback itself, because it is the one command that will matter when something is wrong on the real distribution:

```bash
cd ~/static-page-edge-rehearsal
aws cloudfront get-distribution-config --id "$DIST_ID" --profile domits --region us-east-1 --output json > rehearsal-attached.json
jq '.DistributionConfig | .DefaultCacheBehavior.FunctionAssociations.Items |= map(select(.FunctionARN != "arn:aws:cloudfront::115462458880:function/domits-static-page-by-host")) | .DefaultCacheBehavior.FunctionAssociations.Quantity = (.DefaultCacheBehavior.FunctionAssociations.Items | length)' rehearsal-attached.json > rehearsal-detached.json
aws cloudfront update-distribution --id "$DIST_ID" --if-match "$(jq -r .ETag rehearsal-attached.json)" --distribution-config file://rehearsal-detached.json \
  --profile domits --region us-east-1 --output json --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Quantity' \
  && aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile domits --region us-east-1 && echo detached
printf '<!doctype html><html><head><title>rehearsal page for %s</title></head><body>static page</body></html>\n' "$DIST_DOMAIN" \
  | aws s3 cp - "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region eu-north-1 --content-type "text/html; charset=utf-8" --cache-control "public, max-age=300"
curl -s "https://$DIST_DOMAIN/" | grep -c "You need to enable JavaScript"
```

Expected: `0`, `detached`, and `1`: with the association gone, `/` serves the shell again even though a page object exists, which is exactly what the real rollback must do.

Cleanup, always, even when a check failed (nothing here touches the real distribution or bucket):

```bash
cd ~/static-page-edge-rehearsal
aws cloudfront get-distribution-config --id "$DIST_ID" --profile domits --region us-east-1 --output json > rehearsal-config.json
jq '.DistributionConfig | .Enabled = false' rehearsal-config.json > rehearsal-disabled.json
aws cloudfront update-distribution --id "$DIST_ID" --if-match "$(jq -r .ETag rehearsal-config.json)" --distribution-config file://rehearsal-disabled.json \
  --profile domits --region us-east-1 --output json --query 'Distribution.DistributionConfig.Enabled' \
  && aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile domits --region us-east-1 \
  && aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$(aws cloudfront get-distribution-config --id "$DIST_ID" --profile domits --region us-east-1 --query ETag --output text)" --profile domits --region us-east-1 \
  && echo "distribution deleted"
aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$(aws cloudfront get-origin-access-control --id "$OAC_ID" --profile domits --region us-east-1 --query ETag --output text)" --profile domits --region us-east-1 && echo "oac deleted"
aws s3 rm "s3://$REHEARSAL_BUCKET" --recursive --profile domits --region eu-north-1 && aws s3 rb "s3://$REHEARSAL_BUCKET" --profile domits --region eu-north-1 && echo "bucket deleted"
aws cloudfront list-distributions --profile domits --region us-east-1 --query 'DistributionList.Items[].[Id,Comment]' --output text
```

Expected: `false`, then `distribution deleted`, `oac deleted`, `bucket deleted`, and the final list shows only the two existing distributions (`E1B9FQOMI0Y9N` and `E18TUBOKUXD9TW`). Each line stops at its first failing command, so a missing `deleted` means the chain broke there: fix that command before the next, never skip ahead to the bucket. The OAC delete can answer `OriginAccessControlInUse` for a minute after the distribution delete; run it again.

What the rehearsal proves: the published function runs on a real distribution with the real cache policy, origin access control and error responses, the rewrite, the fallback, the direct-key refusal, the invalidation of the rewritten key and the detachment. What it cannot prove, because a standard distribution answers to one hostname: the wildcard tenant, several hostnames inside one tenant, isolation between tenants, and tenant invalidations. Those are checked on the real distribution in step 5, each with its own one-command rollback.

## 5. Attach the function to the sites distribution [CHANGES WHAT EVERY HOST SITE SERVES]

Only after step 4 passed and the cleanup ran. Read the configuration right before the change and pass its ETag, so a change made in between makes the update fail instead of being overwritten.

```bash
mkdir -p ~/static-page-edge-rollout && cd ~/static-page-edge-rollout
aws cloudfront get-distribution-config --id E18TUBOKUXD9TW --profile domits --region us-east-1 --output json > before.json
jq '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations' before.json
jq '.DistributionConfig | .DefaultCacheBehavior.FunctionAssociations = {"Quantity": 1, "Items": [{"FunctionARN": "arn:aws:cloudfront::115462458880:function/domits-static-page-by-host", "EventType": "viewer-request"}]}' before.json > after.json
diff <(jq -S .DistributionConfig before.json) <(jq -S . after.json)
aws cloudfront update-distribution --id E18TUBOKUXD9TW --if-match "$(jq -r .ETag before.json)" --distribution-config file://after.json \
  --profile domits --region us-east-1 --query 'Distribution.{status:Status,functions:DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[].FunctionARN}'
aws cloudfront wait distribution-deployed --id E18TUBOKUXD9TW --profile domits --region us-east-1 && echo deployed
```

Expected: `{"Quantity": 0}` before; the `diff` shows only the `FunctionAssociations` block; the update answers `InProgress` with the function ARN; `deployed` after the wait. A `PreconditionFailed` means the distribution changed between the read and the update: start the step again from the read.

Checks on every kind of hostname the distribution serves: `WITH`, a `*.direct.domits.com` hostname that has a page under `sites/by-host/` (wildcard tenant); `WITHOUT`, one that has none; `CUSTOM`, a custom domain with its own tenant (`www.villasensual.nl` on 2026-10-05, with or without a page); and `developers.domits.com`, the hand-made tenant, which must keep getting the shell:

```bash
WITH=<fallback hostname with a page>; WITHOUT=<fallback hostname without a page>; CUSTOM=www.villasensual.nl
curl -s "https://$WITH/" | grep -o '<link rel="canonical"[^>]*>\|<title>[^<]*</title>'
curl -sI "https://$WITH/" | grep -i "^HTTP\|^cache-control\|^x-cache"
curl -s "https://$WITHOUT/" | grep -c "You need to enable JavaScript"
curl -s "https://$CUSTOM/" | grep -o '<link rel="canonical"[^>]*>\|<title>[^<]*</title>\|You need to enable JavaScript'
curl -s "https://developers.domits.com/" | grep -c "You need to enable JavaScript"
curl -s "https://$WITH/robots.txt" | head -3
ASSET=$(curl -s "https://$WITHOUT/" | grep -o 'static/js/main\.[a-z0-9]*\.js' | head -1); echo "asset: $ASSET"
curl -sI "https://$WITH/$ASSET" | grep -i "^HTTP\|^content-type"
curl -s -o /dev/null -w "%{http_code}\n" "https://$WITH/sites/by-host/$CUSTOM/index.html"
curl -s "https://www.domits.com/about" | grep -o '<link rel="canonical"[^>]*>'
curl -s "https://www.domits.com/" | grep -c "You need to enable JavaScript"
```

Expected: the site's own `<title>` and a canonical on its main address; `HTTP/2 200` with `cache-control: public, max-age=300`; `1` for the fallback site without a page (shell, as today); for the custom domain its own title and canonical when the worker wrote its page, or `You need to enable JavaScript` when it has none yet, and nothing else; `1` for `developers.domits.com`; the host site's own `robots.txt`; a non-empty `asset:` line followed by `HTTP/2 200` with `content-type: application/javascript` (a shell in its place would say `text/html`); `404` for the direct request to a page key; and `www.domits.com` exactly as before this step (its canonical, and its shell count `1`, come from Amplify, which this function never touches). Then watch for ten minutes, reading the function's own metrics; the three dimensions are all required, a query with fewer dimensions answers nothing and would look like success:

```bash
for metric in FunctionInvocations FunctionValidationErrors FunctionExecutionErrors FunctionThrottles; do
  printf "%-26s " "$metric"
  aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name "$metric" --profile domits --region us-east-1 \
    --dimensions Name=DistributionId,Value=E18TUBOKUXD9TW Name=FunctionName,Value=domits-static-page-by-host Name=Region,Value=Global \
    --statistics Sum --period 300 \
    --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --query 'Datapoints[].Sum' --output text
done
```

Expected: `FunctionInvocations` with a number above zero (the checks above alone are a dozen requests; without a number here the query is wrong and the next three lines prove nothing), and the three error metrics with no datapoint or only `0.0`. Run it again after ten minutes. Any error count above zero is a request the function failed or returned something invalid for: roll back first, then look at `cases.json` for the input that is missing.

Rollback, one read and one update, then the wait:

```bash
cd ~/static-page-edge-rollout
aws cloudfront get-distribution-config --id E18TUBOKUXD9TW --profile domits --region us-east-1 --output json > current.json
jq '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations' current.json
jq '.DistributionConfig | .DefaultCacheBehavior.FunctionAssociations.Items |= map(select(.FunctionARN != "arn:aws:cloudfront::115462458880:function/domits-static-page-by-host")) | .DefaultCacheBehavior.FunctionAssociations.Quantity = (.DefaultCacheBehavior.FunctionAssociations.Items | length)' current.json > rollback.json
aws cloudfront update-distribution --id E18TUBOKUXD9TW --if-match "$(jq -r .ETag current.json)" --distribution-config file://rollback.json \
  --profile domits --region us-east-1 --output json --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Quantity' \
  && aws cloudfront wait distribution-deployed --id E18TUBOKUXD9TW --profile domits --region us-east-1 && echo "rolled back"
```

Expected: the one association from this runbook in the first `jq` (if there is another one, it stays: the filter removes only this function's ARN), then `0` and `rolled back`. The rollback propagates over a few minutes, like the attach did. No invalidation is needed: without the rewrite the cache key for `/` is `/` again, which still holds the shell, and the cached pages under `sites/by-host/` are simply never asked for; a browser that already holds a page keeps it for up to 300 seconds. The function itself stays published and unused; delete it with step 1's rollback once nothing references it.

## For the pull requests that come after this one

- **Invalidating a page.** The cache key of a site's page is the rewritten URI, so the worker or the withdrawal step invalidates `/sites/by-host/<hostname>/index.html` on the tenant that owns the hostname, the way `deploy-direct-booking-sites.yml` already invalidates the shared files. The rehearsal measured that the rewritten key is the one the edge caches the page under; adding `/` and `/index.html` to the same batch costs nothing and covers the case the measurement did not see, so send all three:

  ```bash
  aws cloudfront create-invalidation-for-distribution-tenant --id <tenant id> --profile domits --region us-east-1 \
    --invalidation-batch '{"Paths":{"Quantity":3,"Items":["/sites/by-host/<hostname>/index.html","/","/index.html"]},"CallerReference":"page-<hostname>-<revision>"}'
  ```

  Without any invalidation a new page replaces the old one at the edge within `max-age=300`, and a page for a hostname that had none within 10 seconds; a browser keeps what it holds for its own `max-age=300` either way.
- **The shell deploy.** `deploy-direct-booking-sites.yml` invalidates `/index.html` and `/` on every tenant; with the function attached those keys only serve sites without a page. Sites with a page keep serving their rendered copy until the worker regenerates it after a frontend deploy (PR 11 in the design), which is the intended behaviour: a rendered page references its own hashed assets, which the deploy leaves in place.

## What it costs

CloudFront Functions bill per invocation, about $0.10 per million, and the function runs on every request to every tenant, assets included. Nine sites with a few thousand requests a day each is a few hundred thousand invocations a month: a few cents.
