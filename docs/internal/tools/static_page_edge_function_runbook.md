# Static page edge function: pick the page per hostname (2026-10-05)

Runbook for putting `backend/infrastructure/static-page-edge/viewer-request.js` in front of the direct booking sites distribution `E18TUBOKUXD9TW`. The function is checked by `backend/test/infrastructure/staticPageEdgeFunction.test.js` against `cases.json` next to it; the same cases are replayed below with `aws cloudfront test-function` before anything is published. Nothing in the repository applies any of it; every step is run by hand, in this order, with `--profile domits`, and CloudFront commands with `--region us-east-1` (CloudFront is a global service that the CLI addresses there), S3 commands with `--region eu-north-1`.

Run it only after the worker has written at least one page and its sitemap under `sites/by-host/` in the sites bucket, so that step 5 has something to check. Until step 5 no visitor is affected: steps 1 to 4 create a function nobody uses and a throwaway distribution that no real site's domain points at (the optional alias in step 4 is a test name under a domain you control). Step 5 is a controlled exercise on acceptance until the withdrawal step (the PR that deletes a page on unpublish and delete, with its invalidation) is merged: with the function attached, a page outlives an unpublish for as long as the object stays in the bucket, which the design names as the worst case. Do not leave the function attached past that exercise before withdrawal works; the reconciler for the paths that bypass the controller stays a known gap until its own PR.

## What this changes, and why it is shaped this way

- **One viewer-request function on the default cache behaviour.** Every request CloudFront accepts for any tenant of the distribution passes through it. It handles exactly four URIs, and only for `GET` and `HEAD`: `/` and `/index.html` go to `/sites/by-host/<hostname>/index.html`, `/sitemap.xml` goes to `/sites/by-host/<hostname>/sitemap.xml`, and `/robots.txt` is answered by the function itself. Everything else (hashed assets under `static/`, `favicon.ico`, the preview and dashboard routes, any other path, any other method, and these four with a trailing slash, another case or a percent escape) leaves the function untouched. The allowlist is the safety: the function cannot touch an asset even by accident, because it only acts on those four exact strings. One path is refused rather than passed through: a direct request to `/sites/by-host/...`, also when it is percent-encoded, answers 404 from the function, so the only way to reach a page is through its own hostname and nobody can read another site's page under their domain.
- **The hostname comes from the request, so it is normalised and checked before it becomes a key.** Lower case, surrounding spaces and a trailing dot stripped, and a port accepted only when it is one to five digits. Then the same rule the store applies when it writes a page: at least two labels, each `[a-z0-9]` with hyphens inside, at most 63 characters, the whole name at most 253. A host header that fails that rule (missing, empty, two values, a port that is not a number, two colons, a comma, a slash, two dots in a row, a single label, an IPv6 literal, a non-ASCII letter, an underscore, a percent escape) leaves the request untouched, so no key can ever contain a path separator or anything the store would not have written. A rewrite whose URI plus query string would reach the runtime's limit of 8192 characters is skipped too, so a request with an enormous query string gets the shell instead of a validation error.
- **A site without a page keeps today's behaviour, without code.** The rewritten key does not exist, S3 answers 403 through the origin access control, and the distribution's existing custom error responses (403 and 404 to `/index.html` with status 200) serve the app shell. The edge caches that miss for `ErrorCachingMinTTL`, 10 seconds on this distribution, so an edge that served the shell asks S3 again at most 10 seconds after the worker wrote the page. A page that was served is cached by the edge and by the browser for its own `Cache-Control: public, max-age=300`; an invalidation clears the edge, never a browser that already holds the page.
- **`robots.txt` comes from the function, the sitemap from the worker.** A host site's `robots.txt` depends on its hostname only, so the function answers it: `User-agent: *`, `Allow: /` and `Sitemap: https://<hostname>/sitemap.xml`, as `text/plain` with `max-age=300`; a `HEAD` request gets the same headers without a body. It cannot be missing, stale or left behind by a withdrawal, and a host without a page still gets a valid file rather than the shell. The hostname in it is the normalised one that passed the rule above, so nothing from the header reaches the file unchecked. A host header that fails the rule is not answered and keeps the shared `robots.txt` at the bucket root, as today. The sitemap is what the worker wrote next to the page: the main address lists its root, every other host an empty `urlset`, and a withdrawal empties it instead of deleting it. Until the worker wrote it for a host the key does not exist, and the error response serves the shell for `/sitemap.xml` too, cached 10 seconds; that is why this function is attached only after every published site was built once.
- **The cache cannot hand one site another site's page.** The cache key is the URI after the function ran, and the hostname is part of that URI. The cache policy stays the managed `CachingOptimized`; it does not need the `Host` header in the key, because the path already carries it. Paths that are not rewritten stay shared across hosts, which is right: the assets are the same for every site. The 404 on direct `/sites/by-host/` requests closes the other road to another site's page: the key namespace is reachable only through the rewrite.
- **A bug in the function would hit every site at once, so the function must not throw.** Everything after the event is read sits in one `try`, and the `catch` returns the request unchanged; a thrown error would otherwise cost the viewer a 503, and a returned request CloudFront cannot validate a 502. The source stays under 10,000 bytes (the stricter reading of the 10 KB limit), is one plain synchronous `function handler` that imports nothing and uses no store, network, timers or promises (the test pins all of this), compiles in Node, and the 75 cases in `cases.json` and the redirect cases that use the alias map the function ships with are run in the unit test and again with `test-function` on the real runtime, including the inputs that must leave the request alone, the ones that must be refused and the ones on either side of the 8192 limit, including a repeated query parameter. What that cannot prove: the compute limit under real load, which is why step 5 reads the function's own CloudWatch metrics, including its compute utilization.
- **`www.domits.com` and `acceptance.domits.com` are not on this distribution.** They are served by Amplify through another CloudFront distribution; this function is attached to `E18TUBOKUXD9TW` only. The one hand-made tenant on it, `developers-test` (`developers.domits.com`), also gets the rewrite, has no page object, and so keeps getting the shell exactly as today.
- **Considered and rejected: a KeyValueStore or a per-tenant parameter.** The design document (`SEO phase 2`, point 3) settles on keys by hostname: no lookup, no second source of truth, and a moved domain is owned by whoever wrote the key last. The wildcard tenant holds many sites with one parameter set, so a tenant parameter could not tell them apart. The alias redirects tried the key value store `domits-static-page-redirects` and went back to a map in the code; see step 6 and the alias redirects below.

## What happens if it goes wrong

| Case | What a visitor sees | What to do |
| --- | --- | --- |
| the function throws on some input | 503 on that request only, for every tenant that sends that input | cannot happen for the inputs in `cases.json`; for anything else the `catch` returns the request. Step 2 proves it on the real runtime |
| the rewrite points at a key that does not exist | the app shell, as today, cached 10 seconds | nothing; that is the designed fallback |
| a host has no sitemap yet | `/sitemap.xml` answers the shell for that host, cached 10 seconds, exactly as before this function | queue a build for the site (republish it, or the reconciler once it is merged); the next run writes the page and the sitemap |
| a page is wrong | that site shows the wrong page until the worker overwrites the object (`max-age=300`) | fix the worker, or delete the object and invalidate `/sites/by-host/<hostname>/index.html` on the site's tenant: the shell comes back at once, or within 300 seconds without the invalidation |
| an alias is not in the map yet | the alias serves its own page, as before the redirect existed | step 6 |
| a primary in the map stopped serving its site (custom domain removed or changed, site unpublished) | the aliases of that site still answer a `301` to the old primary until the next publish, and a browser or edge that saw the `301` keeps it for up to an hour | step 6 the same day the domain or the site changed |
| a new version of the function is expensive on the first requests after a publish | nothing yet; AWS throttles a function that keeps exceeding its compute limit | the watch in step 6 rolls back when the highest compute of a minute passes 60 in the first ten minutes |
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

The unit test ran the source in Node. This runs it in CloudFront's own runtime, one case at a time, and compares what it returns with what the test expected: every case in `cases.json`, and every case in `redirect-cases.json` that uses the alias map the function ships with (the ones without their own `aliases`).

```bash
cd /path/to/Domits/backend/infrastructure/static-page-edge
ETAG=$(aws cloudfront describe-function --name domits-static-page-by-host --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text)
jq -s '.[0] + [.[1][] | select(has("aliases") | not)]' cases.json redirect-cases.json > /tmp/edge-cases.json
CANONICAL='def canonical: if startswith("location ") and contains("?") then index("?") as $i | .[:$i] + " " + (.[$i + 1:] | split("&") | reduce .[] as $p ([]; if length > 0 and (.[-1][0] | split("=")[0]) == ($p | split("=")[0]) then .[:-1] + [.[-1] + [$p]] else . + [[$p]] end) | map(join("&")) | sort | tojson) else . end;'
failures=0
for i in $(seq 0 $(( $(jq length /tmp/edge-cases.json) - 1 ))); do
  jq -c ".[$i] | {version:\"1.0\",context:{eventType:\"viewer-request\"},viewer:{ip:\"203.0.113.1\"},request:{method:.method,uri:.uri,querystring:(.querystring // {}),headers:(if .host == null then {} else {host:({value:.host} + (if .multiValue then {multiValue:(.multiValue | map({value:.}))} else {} end))} end),cookies:{}}}" /tmp/edge-cases.json > /tmp/edge-event.json
  expected=$(jq -r ".[$i] | if .expectedLocation then \"location \\(.expectedLocation)\" elif .expectedRobotsFor and .method == \"HEAD\" then \"robots-head\" elif .expectedRobotsFor then \"robots \\(.expectedRobotsFor)\" elif .expectedStatus then \"status \\(.expectedStatus)\" else .expectedUri end" /tmp/edge-cases.json)
  result=$(aws cloudfront test-function --name domits-static-page-by-host --stage DEVELOPMENT --if-match "$ETAG" --profile domits --region us-east-1 \
    --event-object fileb:///tmp/edge-event.json --query 'TestResult.{output:FunctionOutput,error:FunctionErrorMessage,cpu:ComputeUtilization}' --output json)
  actual=$(printf '%s\n' "$result" | jq -r '.output | fromjson | if .response.statusCode == 301 then "location " + .response.headers.location.value elif .response.statusCode == 200 and .response.body == null then "robots-head" elif .response.statusCode == 200 then "robots " + ((.response.body.data // .response.body) | capture("Sitemap: https://(?<h>[^/]+)/").h) elif .response then "status \(.response.statusCode)" else .request.uri end')
  error=$(printf '%s\n' "$result" | jq -r '.error // empty')
  cpu=$(printf '%s\n' "$result" | jq -r '.cpu')
  if [ "$(jq -rn --arg v "$actual" "$CANONICAL \$v | canonical")" != "$(jq -rn --arg v "$expected" "$CANONICAL \$v | canonical")" ] || [ -n "$error" ]; then failures=$((failures + 1)); echo "FAIL $(jq -r ".[$i].name" /tmp/edge-cases.json): got '$actual' expected '$expected' error '$error'"; fi
  echo "$cpu $(jq -r ".[$i].name" /tmp/edge-cases.json): $actual"
done
echo "failures: $failures"
```

Expected: `failures: 0` (a case that expects a refusal prints `status 404` instead of a URI, a `robots.txt` case prints `robots <hostname>`, the host its `Sitemap:` line names, the `HEAD` case for `robots.txt` prints `robots-head`, a 200 without a body, and a redirect case prints `location <url>`), no `FunctionErrorMessage` on any case, and a compute utilization well under 100 (a one or two digit number; the limit that matters is the runtime's one millisecond, which this function does not come near). A location is compared with the query names in any order, because the runtime does not keep the order of different names; the scheme, the host, the path, every name and value, and the order of the values of one name must match exactly, the same rule as the unit test. Any failure means the runtime behaves differently from Node for that input: stop, fix the function, `update-function` with the new code and the current ETag, and run this step again. What this step does not exercise: the `catch`, because the replay feeds the function well-formed events only, the redirect cases with their own `aliases`, because the runtime only holds the map that was uploaded, and the validation CloudFront applies to a published function on a real request, which `test-function` does not fully reproduce; that is what the rehearsal is for. A low number here says nothing about the first requests after a publish on LIVE; step 6 watches those.

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
printf '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://%s/</loc></url>\n</urlset>\n' "$DIST_DOMAIN" \
  | aws s3 cp - "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/sitemap.xml" --profile domits --region eu-north-1 \
    --content-type "application/xml; charset=utf-8" --cache-control "public, max-age=300"
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
curl -s "https://$DIST_DOMAIN/sitemap.xml" | grep -o "<loc>[^<]*</loc>"
curl -sI "https://$DIST_DOMAIN/sitemap.xml" | grep -i "^HTTP\|^content-type"
curl -sI "https://$DIST_DOMAIN/static/js/probe.js" | grep -i "^HTTP\|^content-type"
curl -s "https://$DIST_DOMAIN/hostdashboard" | grep -c "You need to enable JavaScript"
curl -s -o /dev/null -w "%{http_code}\n" "https://$DIST_DOMAIN/sites/by-host/$DIST_DOMAIN/index.html"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://$DIST_DOMAIN/"
aws s3 rm "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region eu-north-1
INV_ID=$(aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region us-east-1 --query Invalidation.Id --output text) \
  && aws cloudfront wait invalidation-completed --distribution-id "$DIST_ID" --id "$INV_ID" --profile domits --region us-east-1 \
  && curl -s "https://$DIST_DOMAIN/" | grep -c "You need to enable JavaScript"
```

Expected, in order: `<title>rehearsal page for <domain></title>` three times (root, `/index.html`, root with a query string); a `HTTP/2 200` with `content-type: text/html; charset=utf-8`, `cache-control: public, max-age=300` and an `x-cache` header; the function's own `robots.txt`, three lines ending in `Sitemap: https://<domain>/sitemap.xml` (not the rehearsal bucket's `Disallow: /rehearsal`, which a valid host never reaches any more); `<loc>https://<domain>/</loc>` and `HTTP/2 200` with `content-type: application/xml; charset=utf-8` for the sitemap; `HTTP/2 200` with `content-type: application/javascript` for the asset (a shell served in its place would say `text/html`, which is why the status alone is not enough); `1` (any app route gets the shell: the key is missing, S3 answers 403 through the origin access control, and the 403 error response serves the shell); `404` for the direct request to a page key, which the function refuses; `403` for the POST (CloudFront refuses a method outside `AllowedMethods` before any origin is asked, and the function never rewrote it; if a `200` shows up here, the error response turned that 403 into the shell, which is also harmless); and after the delete and the invalidation, `1`: the page is gone and the shell is back. The invalidation names the rewritten key, because that is the key the edge cached the page under; without it the page would stay at the edge for its `max-age=300`, and a browser that already holds it keeps it for the same time whatever is invalidated. A `503` or `502` anywhere means the function failed or returned something CloudFront could not validate: stop, read the two function metrics from step 5 for this distribution (`$DIST_ID`), and do not continue to step 5. The first `curl` of `/` right after the deploy can still answer the shell for up to 10 seconds if an edge cached the miss before the object landed; run it again. Two of the inputs in `cases.json` are not handed to the function on the wire: a broken percent escape in the URI (`/sites/by-host/<host>/%zz`, `/%E0`) was answered by CloudFront's own `400` page on 2026-10-06, so those two cases are proven by the replay in step 2 only. A `Host` header with a trailing dot or with a port is handed to the function, which selects the page of the normalised hostname and leaves the header itself alone (seen the same day: both answered the distribution's own page), and the POST answered the shell with `200`.

Optional, done on 2026-10-06 with `edge.villasensual.nl`: a second hostname on the throwaway distribution, so that two hosts with two pages are checked before step 5. The checks above deleted the page of `$DIST_DOMAIN`, so first put it back and confirm its `<title>` exactly as the first two commands of the rollback rehearsal below do. Then request a certificate for a test name under a domain you control, enter its validation CNAME and a CNAME from `<name>` to `$DIST_DOMAIN` at the DNS provider, wait for `ISSUED`, and add the alias and the certificate to the throwaway distribution (`$DIST_ID`, never `E18TUBOKUXD9TW`):

```bash
cd ~/static-page-edge-rehearsal
CERT_ARN=$(aws acm request-certificate --domain-name <name> --validation-method DNS --profile domits --region us-east-1 --query CertificateArn --output text); echo "$CERT_ARN"
aws acm describe-certificate --certificate-arn "$CERT_ARN" --profile domits --region us-east-1 --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
until [ "$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --profile domits --region us-east-1 --query Certificate.Status --output text)" = ISSUED ]; do sleep 20; done; echo issued
aws cloudfront get-distribution-config --id "$DIST_ID" --profile domits --region us-east-1 --output json > rehearsal-before-alias.json
jq --arg a <name> --arg c "$CERT_ARN" '.DistributionConfig | .Aliases = {"Quantity":1,"Items":[$a]} | .ViewerCertificate = {"ACMCertificateArn":$c,"SSLSupportMethod":"sni-only","MinimumProtocolVersion":"TLSv1.2_2021"}' rehearsal-before-alias.json > rehearsal-with-alias.json
aws cloudfront update-distribution --id "$DIST_ID" --if-match "$(jq -r .ETag rehearsal-before-alias.json)" --distribution-config file://rehearsal-with-alias.json --profile domits --region us-east-1 --query 'Distribution.DistributionConfig.Aliases.Items' \
  && aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile domits --region us-east-1 && echo deployed
printf '<!doctype html><html><head><title>rehearsal page for %s</title></head><body>static page</body></html>\n' <name> \
  | aws s3 cp - "s3://$REHEARSAL_BUCKET/sites/by-host/<name>/index.html" --profile domits --region eu-north-1 --content-type "text/html; charset=utf-8" --cache-control "public, max-age=300"
```

Expected: the validation record to enter, `issued`, the alias in the update's answer, `deployed`. Then: `https://<name>/` and `https://$DIST_DOMAIN/` each answer their own `<title>` and never the other's; `https://<name>/sites/by-host/$DIST_DOMAIN/index.html` answers `404`; deleting one page and invalidating its key (as in the checks above) gives that hostname the shell while the other keeps its page. The cleanup below deletes the certificate after the distribution; remove both DNS records afterwards.

Then rehearse the rollback itself, because it is the one command that will matter when something is wrong on the real distribution. First put the page back and prove it is served while the function is attached, so that the shell after detaching is the function's absence and not a leftover miss:

```bash
cd ~/static-page-edge-rehearsal
printf '<!doctype html><html><head><title>rehearsal page for %s</title></head><body>static page</body></html>\n' "$DIST_DOMAIN" \
  | aws s3 cp - "s3://$REHEARSAL_BUCKET/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region eu-north-1 --content-type "text/html; charset=utf-8" --cache-control "public, max-age=300"
INV_ID=$(aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/sites/by-host/$DIST_DOMAIN/index.html" --profile domits --region us-east-1 --query Invalidation.Id --output text) \
  && aws cloudfront wait invalidation-completed --distribution-id "$DIST_ID" --id "$INV_ID" --profile domits --region us-east-1 \
  && curl -s "https://$DIST_DOMAIN/" | grep -o "<title>[^<]*</title>"
aws cloudfront get-distribution-config --id "$DIST_ID" --profile domits --region us-east-1 --output json > rehearsal-attached.json
jq '.DistributionConfig | .DefaultCacheBehavior.FunctionAssociations.Items |= map(select(.FunctionARN != "arn:aws:cloudfront::115462458880:function/domits-static-page-by-host")) | .DefaultCacheBehavior.FunctionAssociations.Quantity = (.DefaultCacheBehavior.FunctionAssociations.Items | length)' rehearsal-attached.json > rehearsal-detached.json
aws cloudfront update-distribution --id "$DIST_ID" --if-match "$(jq -r .ETag rehearsal-attached.json)" --distribution-config file://rehearsal-detached.json \
  --profile domits --region us-east-1 --output json --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Quantity' \
  && aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile domits --region us-east-1 && echo detached \
  && curl -s "https://$DIST_DOMAIN/" | grep -c "You need to enable JavaScript"
```

Expected: the rehearsal `<title>` first (the page is back and served through the function), then `0`, `detached` and `1`: with the association gone, `/` serves the shell again even though the page object is still there, which is exactly what the real rollback must do. Once the detachment has reached the edge, `/` cannot answer the page any more: without the function the cache key for `/` is `/`, which has never held a page (the page was only ever cached under its rewritten key). The wait can return within seconds of the update: on 2026-10-06 it reported `Deployed` two seconds after the update while the edge still served the page, and the shell came twenty seconds later; why `Deployed` came first is not explained here, so repeat the last `curl` every ten seconds for two minutes before reading anything into it. A page after that means the detachment did not take: wait for `distribution-deployed` once more, run the `curl` again, and if it still answers the page, step 5 does not start until that is understood.

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
[ -n "$CERT_ARN" ] && aws acm delete-certificate --certificate-arn "$CERT_ARN" --profile domits --region us-east-1 && echo "certificate deleted"
aws cloudfront list-distributions --profile domits --region us-east-1 --query 'DistributionList.Items[].[Id,Comment]' --output text
```

Expected: `false`, then `distribution deleted`, `oac deleted`, `bucket deleted`, `certificate deleted` when the optional alias was used, and the final list shows only the two existing distributions (`E1B9FQOMI0Y9N` and `E18TUBOKUXD9TW`). Each line stops at its first failing command, so a missing `deleted` means the chain broke there: fix that command before the next, never skip ahead to the bucket. The OAC delete can answer `OriginAccessControlInUse` for a minute after the distribution delete; run it again.

What the rehearsal proves: the published function runs on a real distribution with the real cache policy, origin access control and error responses, the rewrite, the fallback, the direct-key refusal, the invalidation of the rewritten key and the detachment. What it cannot prove, because a standard distribution has no tenants (with the optional alias it answers to two hostnames, which proves two hosts with two pages, not tenants): the wildcard tenant, several hostnames inside one tenant, isolation between tenants, and tenant invalidations. Those are checked on the real distribution in step 5, each with its own one-command rollback.

## 5. Attach the function to the sites distribution [CHANGES WHAT EVERY HOST SITE SERVES]

Only after step 4 passed and the cleanup ran. Read the configuration right before the change and pass its ETag, so a change made in between makes the update fail instead of being overwritten.

```bash
mkdir -p ~/static-page-edge-rollout && cd ~/static-page-edge-rollout
aws cloudfront get-distribution-config --id E18TUBOKUXD9TW --profile domits --region us-east-1 --output json > before.json
jq '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations' before.json
jq '.DistributionConfig | .DefaultCacheBehavior.FunctionAssociations = {"Quantity": 1, "Items": [{"FunctionARN": "arn:aws:cloudfront::115462458880:function/domits-static-page-by-host", "EventType": "viewer-request"}]}' before.json > after.json
diff <(jq -S .DistributionConfig before.json) <(jq -S . after.json)
aws cloudfront update-distribution --id E18TUBOKUXD9TW --if-match "$(jq -r .ETag before.json)" --distribution-config file://after.json \
  --profile domits --region us-east-1 --output json --query 'Distribution.{status:Status,functions:DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[].FunctionARN}' \
  && aws cloudfront wait distribution-deployed --id E18TUBOKUXD9TW --profile domits --region us-east-1 && echo deployed
```

Expected: `{"Quantity": 0}` before; the `diff` shows only the `FunctionAssociations` block; the update answers `InProgress` with the function ARN; `deployed` after the wait. A `PreconditionFailed` means the distribution changed between the read and the update: start the step again from the read.

Checks on every kind of hostname the distribution serves: `WITH` and `WITH2`, two `*.direct.domits.com` hostnames that have a page under `sites/by-host/` (both on the wildcard tenant, so two sites in one tenant get two different pages); `WITHOUT`, one that has none; `CUSTOM`, the custom domain with its own tenant (`www.villasensual.nl` on 2026-10-05; publish that site first so it has a page, otherwise the custom tenant stays unverified and this runbook says so in the summary); and `developers.domits.com`, the hand-made tenant, which must keep getting the shell:

```bash
WITH=<fallback hostname with a page>; WITH2=<another fallback hostname with a page>; WITHOUT=<fallback hostname without a page>; CUSTOM=www.villasensual.nl
curl -s "https://$WITH/" | grep -o '<link rel="canonical"[^>]*>\|<title>[^<]*</title>'
curl -s "https://$WITH2/" | grep -o '<link rel="canonical"[^>]*>\|<title>[^<]*</title>'
curl -s "https://$WITH/" | grep -o '<title>[^<]*</title>'
curl -s "https://$WITH2/" | grep -o '<title>[^<]*</title>'
curl -sI "https://$WITH/" | grep -i "^HTTP\|^cache-control\|^x-cache"
curl -sI "https://$WITH2/" | grep -i "^HTTP\|^cache-control\|^x-cache"
curl -s "https://$WITHOUT/" | grep -c "You need to enable JavaScript"
curl -s "https://$CUSTOM/" | grep -o '<link rel="canonical"[^>]*>\|<title>[^<]*</title>\|You need to enable JavaScript'
curl -s "https://developers.domits.com/" | grep -c "You need to enable JavaScript"
curl -s "https://$WITH/robots.txt"
curl -s "https://$WITH/sitemap.xml" | grep -o '<loc>[^<]*</loc>\|</urlset>'
curl -sI "https://$WITH/sitemap.xml" | grep -i "^HTTP\|^content-type"
curl -s "https://$WITHOUT/sitemap.xml" | grep -o '</urlset>\|You need to enable JavaScript' 
ASSET=$(curl -s "https://$WITHOUT/" | grep -o 'static/js/main\.[a-z0-9]*\.js' | head -1); echo "asset: $ASSET"
curl -sI "https://$WITH/$ASSET" | grep -i "^HTTP\|^content-type"
curl -s -o /dev/null -w "%{http_code}\n" "https://$WITH/sites/by-host/$CUSTOM/index.html"
curl -s "https://www.domits.com/about" | grep -o '<link rel="canonical"[^>]*>'
curl -s "https://www.domits.com/" | grep -c "You need to enable JavaScript"
```

Expected: the first site's own `<title>` and canonical, then the second site's own title and canonical (different from the first: two sites, one tenant, two pages), then both titles again, each still its own (the second site did not replace the first); for both, `HTTP/2 200` with `cache-control: public, max-age=300` and `x-cache: Hit from cloudfront` (the first requests warmed the edge you are talking to; a `Miss` on either means that request went to another edge, run the two `curl -sI` lines once more); `1` for the fallback site without a page (shell, as today); for the custom domain its own title and canonical, and nothing else; `1` for `developers.domits.com`; the function's `robots.txt` with `Sitemap: https://$WITH/sitemap.xml`; for `$WITH` its sitemap, its own `<loc>` when it is the site's main address and only `</urlset>` when the site has a custom domain as main address, with `content-type: application/xml; charset=utf-8`; for `$WITHOUT` `</urlset>` when its site was withdrawn and the shell's `You need to enable JavaScript` when it never had a page (the gap described above); a non-empty `asset:` line followed by `HTTP/2 200` with a JavaScript content type, `content-type: text/javascript` (how the site deploy stores the bundle, and what the sites served on 2026-10-20 and 2026-10-21) or `content-type: application/javascript`; only `text/html` is wrong, because then the shell is served in its place; `404` for the direct request to a page key; and `www.domits.com` exactly as before this step (its canonical, and its shell count `1`, come from Amplify, which this function never touches).

Then one tenant invalidation, to prove that the key the later PRs will invalidate is the key the tenant caches the page under. The proof is the `age` header: the copy the edge holds at the warm check keeps ageing, so at the end of the check the old copy would be exactly `warm age + seconds since the warm check` old, and a copy younger than that was fetched again. That number has to stay under 300, the page's own lifetime, otherwise plain expiry explains a fresh copy too:

```bash
TENANT_ID=$(aws cloudfront list-distribution-tenants --profile domits --region us-east-1 --association-filter DistributionId=E18TUBOKUXD9TW \
  --query "DistributionTenantList[?contains(join(',', Domains[].Domain), '*.direct.domits.com')].Id | [0]" --output text); echo "$TENANT_ID"
WARM_AT=$(date +%s); WARM=$(curl -sI "https://$WITH/"); echo "$WARM" | grep -i "^HTTP\|^x-cache\|^age\|^x-amz-cf-pop"
WARM_AGE=$(echo "$WARM" | awk 'tolower($1) == "age:" { print $2 }' | tr -d '\r'); echo "warm age: ${WARM_AGE:-none}"
INV_ID=$(aws cloudfront create-invalidation-for-distribution-tenant --id "$TENANT_ID" --profile domits --region us-east-1 --output json \
  --invalidation-batch "{\"Paths\":{\"Quantity\":1,\"Items\":[\"/sites/by-host/$WITH/index.html\"]},\"CallerReference\":\"edge-runbook-$(date +%s)\"}" \
  --query Invalidation.Id --output text); echo "$INV_ID"
until [ "$(aws cloudfront get-invalidation-for-distribution-tenant --distribution-tenant-id "$TENANT_ID" --id "$INV_ID" --profile domits --region us-east-1 --query Invalidation.Status --output text)" = "Completed" ]; do sleep 10; done
echo "completed $(( $(date +%s) - WARM_AT )) seconds after the warm check"
curl -sI "https://$WITH/" | grep -i "^HTTP\|^x-cache\|^age\|^x-amz-cf-pop"; echo "the old copy would be $(( WARM_AGE + $(date +%s) - WARM_AT )) seconds old now"
```

Expected: the wildcard tenant's id; the warm check with `x-cache: Hit from cloudfront`, an `age`, an `x-amz-cf-pop` and a `warm age` that is a number (if it says `Miss` or `none`, run the two warm lines again until it is a `Hit` with an age); an invalidation id; `completed N seconds after the warm check`; then the same `x-amz-cf-pop` as the warm check (a different one is a different cache and proves nothing, run the last line again until the pop matches) and `the old copy would be M seconds old now` with M under 290 (if M is higher the old copy may simply have expired, so nothing is proven: start again from the warm check). The result is then read off the `age`: `x-cache: Miss from cloudfront`, or a `Hit` whose `age` is at least five seconds under M, means the copy this edge holds was fetched after the warm check; inside the page's lifetime that is what an invalidation does, so this is a strong sign the key is right (not a proof: an edge can also drop a copy early, or fill a miss from the regional cache). The proof with a changed page comes with the withdrawal PR, which replaces the page and reads the new content back. A `Hit` whose `age` is M, give or take a second, is the old copy, still there after the invalidation completed: the invalidation path for the later PRs is wrong, roll back (below), then write down what was observed; the function does not stay attached on a failed check. If the status loop never ends, stop it after ten minutes and treat that the same way.

Then watch for ten minutes, reading the function's own metrics; the three dimensions are all required, a query with fewer dimensions answers nothing and would look like success:

```bash
for metric in FunctionInvocations FunctionValidationErrors FunctionExecutionErrors FunctionThrottles; do
  printf "%-26s " "$metric"
  aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name "$metric" --profile domits --region us-east-1 \
    --dimensions Name=DistributionId,Value=E18TUBOKUXD9TW Name=FunctionName,Value=domits-static-page-by-host Name=Region,Value=Global \
    --statistics Sum --period 300 \
    --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --query 'Datapoints[].Sum' --output text
done
aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name FunctionComputeUtilization --profile domits --region us-east-1 \
  --dimensions Name=DistributionId,Value=E18TUBOKUXD9TW Name=FunctionName,Value=domits-static-page-by-host Name=Region,Value=Global \
  --statistics Average --period 300 \
  --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --query 'Datapoints[].Average' --output text
```

Expected: `FunctionInvocations` with a number above zero (the checks above alone are a dozen requests; without a number here the query is wrong and the next three lines prove nothing), the three error metrics with no datapoint or only `0.0`, and a compute utilization far below 100 (`Average` is the only statistic CloudFront publishes for it; the `test-function` replays answered 5 to 11). Run it again after ten minutes. Any error count above zero is a request the function failed or returned something invalid for: roll back first, then look at `cases.json` for the input that is missing.

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

Expected: the one association from this runbook in the first `jq` (if there is another one, it stays: the filter removes only this function's ARN), then `0` and `rolled back`. The wait can return within seconds while an edge still serves the previous configuration for a short while (seen in the step 4 rehearsal on 2026-10-06), so check a site's `/` every ten seconds for two minutes before concluding anything. No invalidation is needed: without the rewrite the cache key for `/` is `/` again, which still holds the shell, and the cached pages under `sites/by-host/` are simply never asked for; a browser that already holds a page keeps it for up to 300 seconds. The 404 on direct `/sites/by-host/` requests goes with the function: after the rollback a page object can again be fetched by its key through any hostname on the distribution, as it can today. The function itself stays published and unused; delete it with step 1's rollback once nothing references it.

## 6. Add or remove an alias, then publish the new version [CHANGES WHAT EVERY HOST SITE SERVES]

The alias map is the one line `var ALIASES = {...};` near the top of `viewer-request.js`: JSON without spaces, sorted by alias, `{"<alias>":"<primary>",...}`, so one list of aliases always gives the same bytes. Nothing else in the file holds aliases. An alias is every active domain of a published site other than its primary, when that primary is an active custom domain, the same rule as `staticPageRedirectPlan.js`. Nothing changes the map on its own. Until a new version is published, a new alias serves its own page, and a primary that stopped serving its site keeps receiving the redirects of its aliases. So run this step the same day a site gets a custom domain as its primary, changes or loses it, or is unpublished or deleted while it has one. Every publish changes the one function that serves every site, which is why each one goes through the replay and the watch below.

Who does what:

1. Karim gives his ok first. Then the alias query runs read-only against the database, and nothing else does. Karim keeps the query; its result is tab separated, with a header row that names at least the columns `alias` and `primary_domain`, and one row per alias. Save it as `aliases.tsv`.
2. A developer writes the map on a branch from `acceptance`:

   ```bash
   cd /path/to/Domits/backend
   node infrastructure/static-page-edge/write-aliases.mjs /path/to/aliases.tsv
   git diff --stat
   git fetch -q origin
   aliases() { sed -n 's/^var ALIASES = \(.*\);$/\1/p' | jq -r 'to_entries[] | "\(.key) -> \(.value)"'; }
   diff <(git show origin/acceptance:backend/infrastructure/static-page-edge/viewer-request.js | aliases) <(aliases < infrastructure/static-page-edge/viewer-request.js)
   npm test -- test/infrastructure
   ```

   Expected: `Aliases written: N. The function is now B bytes.`, with N the number of rows in the result; one changed line in `viewer-request.js` and no other file; a `<` line for every alias removed and a `>` line for every alias added, each as `alias -> primary`; green tests. The script refuses and writes nothing when an alias or a primary is not a lowercase hostname without a port or a trailing dot, when an alias points at itself or is listed twice, when a primary is an alias itself (a chain), or when the function would reach 10,000 bytes. Fix the data, or leave the row out on purpose and say why in the pull request. The cases in `redirect-cases.json` without their own `aliases` run against the map in the code, so a case whose host stopped being an alias, or one in `cases.json` whose host became one, fails: point that case at a host that still has the role the case describes.
3. A pull request against `acceptance` with the diff, and for each added alias the `301` it will answer. Normal review. Nothing deploys the function on merge.
4. After the merge, whoever has CloudFront access publishes it with the commands below, from a clean checkout of `origin/acceptance` at the merge, and watches it.

Size: the function must stay under 10,000 bytes, so at most 9,999. With an empty map it is 4,812 bytes, which leaves 5,187. Each alias adds its two hostnames plus 6 bytes (four quotes, a colon and a comma; the first alias has no comma, so n aliases cost their hostnames plus 6n - 1). A fallback hostname is at most 67 characters (a slug of at most 40, a hyphen, 8 characters of the site id, `.direct.domits.com`); today's is 51. A primary such as `www.villasensual.nl` is 19. A typical alias then costs 51 + 19 + 6 = 76 bytes, and 76n - 1 <= 5,187 gives 68 aliases. The longest realistic one, a 67 character alias to a 40 character primary, costs 113 bytes, and 113n - 1 <= 5,187 gives 45. Today the function is 4,887 bytes with one alias. `staticPageEdgeAliasMap.test.js` keeps room for 40 of the longest, and the script refuses a map that would reach 10,000 bytes. Past about 40 aliases the map does not belong in the code any more.

Put the merged code on DEVELOPMENT, keep the code and the configuration that LIVE has now for the rollback, and check that no store is attached:

```bash
mkdir -p ~/static-page-edge-publish && cd ~/static-page-edge-publish
FN=domits-static-page-by-host
cp /path/to/Domits/backend/infrastructure/static-page-edge/viewer-request.js new.js
aws cloudfront get-function --name $FN --stage LIVE --profile domits --region us-east-1 previous-live.js > /dev/null
aws cloudfront describe-function --name $FN --stage LIVE --profile domits --region us-east-1 --query FunctionSummary.FunctionConfig --output json > previous-config.json; cat previous-config.json
ETAG=$(aws cloudfront describe-function --name $FN --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text)
aws cloudfront update-function --name $FN --if-match "$ETAG" --profile domits --region us-east-1 \
  --function-config '{"Comment":"Serves the static page, sitemap and robots.txt of the requested hostname","Runtime":"cloudfront-js-2.0"}' \
  --function-code fileb://new.js --query FunctionSummary.FunctionMetadata.Stage --output text
aws cloudfront get-function --name $FN --stage DEVELOPMENT --profile domits --region us-east-1 development.js > /dev/null && cmp new.js development.js && echo "DEVELOPMENT holds the merged code"
aws cloudfront describe-function --name $FN --stage DEVELOPMENT --profile domits --region us-east-1 --query 'length(FunctionSummary.FunctionConfig.KeyValueStoreAssociations.Items || `[]`)' --output text
```

Expected: the configuration LIVE has now (a `Comment` and the runtime `cloudfront-js-2.0`); `DEVELOPMENT`; `DEVELOPMENT holds the merged code`; `0`, no store attached. Then run step 2 from the same checkout, against DEVELOPMENT: `failures: 0`. Do not publish without it.

Write the rollback and the watch. The rollback puts the saved LIVE code and configuration back on DEVELOPMENT and publishes them, the same two calls as the publish itself:

```bash
cd ~/static-page-edge-publish
cat > rollback.sh <<'EOF'
set -euo pipefail
FN=domits-static-page-by-host
etag() { aws cloudfront describe-function --name $FN --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text; }
echo "rollback update: $(aws cloudfront update-function --name $FN --if-match "$(etag)" --profile domits --region us-east-1 --function-config file://previous-config.json --function-code fileb://previous-live.js --query FunctionSummary.FunctionMetadata.Stage --output text)"
echo "rollback publish: $(aws cloudfront publish-function --name $FN --if-match "$(etag)" --profile domits --region us-east-1 --query FunctionSummary.FunctionMetadata.Stage --output text)"
aws cloudfront get-function --name $FN --stage LIVE --profile domits --region us-east-1 rolled-back.js > /dev/null
cmp -s rolled-back.js previous-live.js && echo "LIVE is the previous code again"
EOF
cat > watch.sh <<'EOF'
set -uo pipefail
FN=domits-static-page-by-host
T0=$1; ALIAS=$2; PRIMARY=$3; PLAIN=$4; ASSET=$5
[ -n "$T0" ] && [ -n "$ASSET" ] || { echo "not published or no build file to request, not watching"; exit 2; }
iso() { date -u -r "$1" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "@$1" +%Y-%m-%dT%H:%M:%SZ; }
metric() {
  aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name "$1" --statistics "$2" --period 60 --profile domits --region us-east-1 \
    --dimensions Name=DistributionId,Value=E18TUBOKUXD9TW Name=FunctionName,Value=$FN Name=Region,Value=Global \
    --start-time "$(iso $((T0 - 60)))" --end-time "$(iso "$(date -u +%s)")" --output json
}
expect() {
  local got
  got=$(curl -s -o /dev/null -m 20 -w '%{http_code} %{redirect_url}' "$1")
  printf ' %s' "${got%% *}"
  [ "$got" = "$2 ${3:-}" ]
}
check() {
  local bad=0 errors compute highest minutes
  printf '+%sm:' "$1"
  expect "https://$ALIAS/" 301 "https://$PRIMARY/" || bad=1
  expect "https://$ALIAS/robots.txt" 301 "https://$PRIMARY/robots.txt" || bad=1
  expect "https://$ALIAS/$ASSET" 200 || bad=1
  expect "https://$PRIMARY/" 200 || bad=1
  expect "https://$PRIMARY/robots.txt" 200 || bad=1
  expect "https://$PLAIN/" 200 || bad=1
  errors=$({ metric FunctionExecutionErrors Sum; metric FunctionValidationErrors Sum; } | jq -s '[.[].Datapoints[].Sum] | add // 0')
  compute=$(metric FunctionComputeUtilization Maximum | jq --argjson until $((T0 + 600)) \
    '[.Datapoints[] | select((.Timestamp | sub("\\+00:00$"; "Z") | fromdateiso8601) < $until) | .Maximum]')
  highest=$(printf '%s' "$compute" | jq 'max // 0'); minutes=$(printf '%s' "$compute" | jq length)
  echo " | errors $errors | highest compute in the first 10 minutes $highest, minutes with data $minutes"
  [ "$(echo "$errors == 0" | bc)" = 1 ] || bad=1
  [ "$(echo "$highest <= 60" | bc)" = 1 ] || bad=1
  [ "$1" -lt 5 ] || [ "$minutes" -gt 0 ] || { echo "no compute data after $1 minutes"; bad=1; }
  return $bad
}
for minute in $(seq 1 13); do
  sleep 60
  check "$minute" || { echo "SOMETHING IS OFF, rolling back"; bash rollback.sh; exit 1; }
done
echo "watch done, nothing off"
EOF
```

Then publish and watch. `ALIAS` is one alias of the map (the one just added, if there is one) and `PRIMARY` its primary; `PLAIN` is a fallback hostname that is no alias; the build file is the main bundle the primary's page references, requested on the alias:

```bash
cd ~/static-page-edge-publish
FN=domits-static-page-by-host
ALIAS=beautiful-home-amsterdam-6156b005.direct.domits.com; PRIMARY=www.villasensual.nl; PLAIN=villa-loiki-8cf98e11.direct.domits.com
ASSET=$(curl -s "https://$PRIMARY/" | grep -o 'static/js/main\.[a-z0-9]*\.js' | head -1); echo "asset: $ASSET"
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "https://$ALIAS/$ASSET"
T0=""; [ -n "$ASSET" ] && ETAG=$(aws cloudfront describe-function --name $FN --stage DEVELOPMENT --profile domits --region us-east-1 --query ETag --output text) \
  && aws cloudfront publish-function --name $FN --if-match "$ETAG" --profile domits --region us-east-1 --query FunctionSummary.FunctionMetadata.Stage --output text \
  && T0=$(date -u +%s)
aws cloudfront get-function --name $FN --stage LIVE --profile domits --region us-east-1 live.js > /dev/null && cmp new.js live.js && echo "LIVE holds the merged code"
bash watch.sh "$T0" "$ALIAS" "$PRIMARY" "$PLAIN" "$ASSET"
```

Expected: a non-empty `asset:` line and `200` with a JavaScript content type before the publish (without an asset nothing is published and the watch says so); `LIVE`; `LIVE holds the merged code`; then thirteen lines such as `+3m: 301 301 200 200 200 200 | errors 0 | highest compute in the first 10 minutes 31, minutes with data 3`, and `watch done, nothing off`. Without `LIVE holds the merged code`, something else reached DEVELOPMENT between the update and the publish: stop the watch with Ctrl-C and run `bash rollback.sh` at once. The two `301`s go to the primary with the same path; the `200` after them is the build file, served on the alias without a redirect. The watch rolls back by itself, and prints `SOMETHING IS OFF, rolling back` and the rollback's own lines, when a status or a location differs, when an execution or validation error is counted, when the highest compute of any minute in the first ten minutes passes 60, or when CloudWatch still has no compute data five minutes after the publish (a watch without data would otherwise pass). Why 60: the version without a store has stayed at or under 53 since it was first published on 2026-10-16, while both versions that read the store reached 88 to 94 on the first requests after their publish. The first ten minutes are where that showed, and the watch runs thirteen because CloudWatch delivers a minute one to three minutes late. Then read the step 5 metrics once more after ten minutes. A rollback is the same two calls and takes one to two minutes; it ends with `LIVE is the previous code again`. Without that line, run `bash rollback.sh` again before anything else.

## For the pull requests that come after this one

- **Alias redirects.** The function answers every GET and HEAD for a hostname in its alias map (`var ALIASES` in `viewer-request.js`) with a `301` to the same path and query on the primary, cached for an hour (`redirect-cases.json`). Step 6 says how the map is made and published. The function checks every entry again when it runs: the target is normalised and must pass the hostname rule, an alias that points at itself is served its page, and a chain is never followed (the first alias of a chain is served its page). The unit test compares each location in `redirect-cases.json` with the query names in any order, because the runtime does not keep the order of different names (on 2026-10-28 `test-function` answered `?r=1&r=2&q=villa%20sea` for an event that listed `q` first); the scheme, the host, the path, every name and value, and the order of the values of one name must still match exactly. Step 2 replays the redirect cases that use the map the function ships with. The cases with their own `aliases` (the targets the function must ignore or normalise, the chain, the empty map) run in the unit test only, because the runtime only ever holds the map that was uploaded.

  The key value store `domits-static-page-redirects`, the inline policy `static-page-redirects` on the role `domits-property-handler` (`static-page-redirects-policy.json`) and the PropertyHandler code that writes the store (`staticPageRedirects.js` and `staticPageRedirectStore.js`, called by the worker, the withdrawal and the reconciler) stay as they are, and stay inactive: they only act when `STATIC_PAGE_REDIRECTS_KVS_ARN` is set on PropertyHandler, and it is not. Leave it unset. The function does not read the store, so keys written there would change nothing a visitor sees. A follow-up decides between two ways: remove them (the store, the policy, the writer code and its tests, in one pull request with the live steps to delete the store and the policy), or let the reconciler produce the alias map from `staticPageRedirectPlan.js` for step 6, in place of the query.
- **Invalidating a page.** The cache key of a site's page is the rewritten URI, so the worker or the withdrawal step invalidates `/sites/by-host/<hostname>/index.html` on the tenant that owns the hostname, the way `deploy-direct-booking-sites.yml` already invalidates the shared files. The rehearsal and step 5 check that the rewritten key is the one the edge caches the page under; adding `/` and `/index.html` to the same batch covers the case those checks did not see, at the price of two more paths against the monthly allowance, so send all three, and with them `/sites/by-host/<hostname>/sitemap.xml` and `/sitemap.xml`, because a build or a withdrawal rewrites the sitemap with the page:

  ```bash
  aws cloudfront create-invalidation-for-distribution-tenant --id <tenant id> --profile domits --region us-east-1 \
    --invalidation-batch '{"Paths":{"Quantity":5,"Items":["/sites/by-host/<hostname>/index.html","/","/index.html","/sites/by-host/<hostname>/sitemap.xml","/sitemap.xml"]},"CallerReference":"page-<site id>-<revision>-<hostname>-<time>"}'
  ```

  The `CallerReference` must be new for every invalidation that must really run: CloudFront answers a repeated reference with the earlier invalidation instead of a new one, so a hostname that moved between sites, or a retry after a change, needs a reference that includes the site, the revision, the hostname and the moment.

  Without any invalidation a new page replaces the old one at the edge within `max-age=300`, and a page for a hostname that had none within 10 seconds; a browser keeps what it holds for its own `max-age=300` either way.
- **The shell deploy.** `deploy-direct-booking-sites.yml` invalidates `/index.html` and `/` on every tenant; with the function attached those keys only serve sites without a page. Sites with a page keep serving their rendered copy until the worker regenerates it after a frontend deploy (PR 11 in the design), which is the intended behaviour: a rendered page references its own hashed assets, which the deploy leaves in place.
- **Which requests can redirect.** Only a GET or HEAD on a hostname that passes the hostname rule, for a path that starts with `/` and is not a file of the web build. The files of the build are what `deploy-direct-booking-sites.yml` uploads next to the page and the crawl files: everything under `/static/` (the hashed assets, their source maps and license files) and the root files in `BUILD_ROOT_FILES` (`/asset-manifest.json`, `/favicon.ico`, `/logo.svg`, `/logo192.png`, `/logo512.png`, `/manifest.json`). They are the same for every site and most of the requests of a page view, so on an alias they are served as they are instead of redirected. Every other path still redirects, whatever it ends in: `/`, `/index.html`, robots.txt, sitemap.xml, every app route, and also paths such as `/offers.json` or `/website-live/villasensual.map` (`.map` is a top level domain), because on a site host every path renders the site page. The hostname is not narrowed further: every active domain of a site other than its primary can be an alias (`staticPageRedirectPlan.js`), the fallback suffix is a setting, and only the map knows which hostname is an alias. When a file is added to `frontend/web/public`, add it to `BUILD_ROOT_FILES`; until then it redirects on an alias, which works but is what the list avoids.

## What it costs

CloudFront Functions bill per invocation, about $0.10 per million, and the function runs on every request CloudFront accepts for any tenant, assets included. Nine sites with a few thousand requests a day each is a few hundred thousand invocations a month: a few cents. The alias map adds nothing to that: no store and no reads.

The limit that matters is compute, not the bill. AWS warns that when `FunctionComputeUtilization` reaches or nears 100, later requests may be throttled, and it advises a review from 80; one function serves every site, so all of them share that risk. Two versions that read the alias redirects from the key value store were published to LIVE, on 2026-10-28 (a `get` for every request) and on 2026-11-01 (an `exists` first, and no lookup for the files of the build). Both times the first requests after the publish cost 88 to 94, mixed with warm requests at 19 to 30 like the version without a store, and both were rolled back. `test-function` showed none of it: on DEVELOPMENT all versions answered between 5 and 13. Which part of the store version made the first requests expensive (the attached store, the `cloudfront` import or the async handler) was not isolated, so the map in the code leaves out all three and keeps the shape of the version without a store: one plain synchronous handler that imports nothing. That shape has stayed at or under 53 since 2026-10-16. Publish a new version only with the watch of step 6.
