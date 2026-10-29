# Destination pages: going live (#3053)

Runbook for the live steps after the serving PRs: the destination pages (`/destinations/...`), the root page (`/destinations`) and the destination sitemap (`/sitemap-destinations.xml`), all served by `PropertyHandler`. Read it fully once before starting. Every step has a check; when a check fails, stop and roll that step back. Never rerun an old deploy run; roll code back with a revert PR.

## What the routes answer

| Request | Answer |
|---|---|
| A destination with a page | `200`, HTML, `Cache-Control: public, max-age=300` |
| `/destinations` with at least one destination with a page | `200`, the root page, same cache |
| `/sitemap-destinations.xml` with at least one destination with a page | `200`, `application/xml`, same cache |
| A destination without a page, an invalid path, no destination at all, or the switch off | `404`, HTML with `noindex, nofollow`, `public, max-age=60` |
| The same path with one trailing slash | `301` to the path without it, `public, max-age=3600` |
| The switch or the database slow (5 s for both together) or down, or a sitemap over 50,000 URLs or 5 MiB | `503`, `no-store`, `Retry-After: 60` |

The host in canonicals and sitemap URLs comes from `X-Forwarded-Host`, but only `www.domits.com` and `acceptance.domits.com` are used; anything else becomes `www.domits.com`. The sitemap only lists paths the page route accepts, so every URL in it is a page.

Timing, so a check does not fail for the wrong reason:

- The switch and the destination tree are kept 60 s per container, and a `404` is cached 60 s, so a change of the switch can take up to about 2 minutes to show everywhere.
- A page is cached 300 s. A destination that loses its last listing answers `404` at the origin straight away, but a cached `200` can stay visible for up to 300 s, and the sitemap can still list it for up to 60 s plus 300 s.

Known limits:

- A sitemap is refused above 50,000 URLs (the sitemap protocol) or 5 MiB (a Lambda response is at most 6 MB); the route then answers `503` and the log names the limit. That is the moment to split it with `buildSitemapIndex`.
- The 5 s limit stops waiting, not the database work itself. If the database connection itself hangs, every request in that container answers `503` after 5 s until the connection or the container recovers.

## Before starting

- The serving PRs are merged into `acceptance`, deployed, and part of a release to `main`. Both branches deploy the same `PropertyHandler`, so a `main` deploy without this code would remove the routes again.
- `main.destination`, `main.property_destination` and their `test` copies exist (see `dsql_destination_runbook.md`).
- AWS CLI on profile `domits`, region `eu-north-1`.

```bash
export AWS_PROFILE=domits AWS_REGION=eu-north-1
export API=wkmwpwurbc ROLE=domits-property-handler PARAM=/destinations/pages/enabled
```

## 1. IAM: let PropertyHandler read the switch

`backend/infrastructure/static-page-worker/property-handler-base-policy.json` lists `parameter/destinations/pages/enabled`; the live role does not yet. No deploy applies IAM.

```bash
aws iam get-role-policy --role-name $ROLE --policy-name property-handler-base --query PolicyDocument --output json > policy-before.json
diff <(jq -S . policy-before.json) <(jq -S . backend/infrastructure/static-page-worker/property-handler-base-policy.json)
aws iam put-role-policy --role-name $ROLE --policy-name property-handler-base --policy-document file://backend/infrastructure/static-page-worker/property-handler-base-policy.json
aws iam simulate-principal-policy --policy-source-arn $(aws iam get-role --role-name $ROLE --query Role.Arn --output text) --action-names ssm:GetParameter --resource-arns arn:aws:ssm:eu-north-1:115462458880:parameter$PARAM arn:aws:ssm:eu-north-1:115462458880:parameter/aurora/dsql/schema --query 'EvaluationResults[].[EvalResourceName,EvalDecision]' --output text
```

Run the `put-role-policy` line only when the `diff` shows nothing but the new `parameter/destinations/pages/enabled` line; anything else means the live role changed after the repo file, so stop and merge that change first.

Check: both resources `allowed`, and an existing route (for example a host dashboard page) still loads.
Rollback: `aws iam put-role-policy --role-name $ROLE --policy-name property-handler-base --policy-document file://policy-before.json`.

## 2. SSM: create the switch, off

```bash
aws ssm put-parameter --name $PARAM --type String --value false
aws ssm get-parameter --name $PARAM --query Parameter.Value --output text
```

Check: prints `false`. Off means every destination path answers `404`.
Rollback: `aws ssm delete-parameter --name $PARAM`; a missing switch is also off.

## 3. API Gateway: three GET routes

Save the current deployment first, and make sure the API has no changes waiting that a new deployment would publish along with these routes. A new deployment publishes the whole API as it is now, not only these routes. This check compares the deployed export with the current configuration, method by method: the authorization (type, authorizer and API key), the request parameters, whether a validator or model is set, the integration and its responses, and for the whole API the gateway responses, binary media types and resource policy. It prints `OK` only when every call worked, neither side is empty, and both sides are equal:

```bash
bash -euo pipefail <<'CHECK'
aws apigateway get-stage --rest-api-id $API --stage-name default --query deploymentId --output text > deployment-before.txt
aws apigateway get-deployment --rest-api-id $API --deployment-id "$(cat deployment-before.txt)" --embed apisummary --output json > summary-before.json
aws apigateway get-export --rest-api-id $API --stage-name default --export-type oas30 --parameters extensions=apigateway export-before.json > /dev/null
aws apigateway get-resources --rest-api-id $API --limit 500 --embed methods --output json > resources-now.json
aws apigateway get-authorizers --rest-api-id $API --limit 500 --output json > authorizers-now.json
aws apigateway get-gateway-responses --rest-api-id $API --limit 500 --output json > gateway-responses-now.json
aws apigateway get-rest-api --rest-api-id $API --output json > api-now.json
jq -c -S --slurpfile summary summary-before.json '
  def templates: . // {} | with_entries(select(.value != null));
  (.paths | to_entries[] | .key as $p | .value | to_entries[] | select(.key != "parameters")
    | (.key | ascii_upcase | sub("X-AMAZON-APIGATEWAY-ANY-METHOD"; "ANY")) as $m | .value as $v | ($v["x-amazon-apigateway-integration"] // {}) as $i
    | {path: $p, method: $m, auth: $summary[0].apiSummary[$p][$m], security: ([$v.security // [] | .[] | keys[]] | sort),
       parameters: ([$v.parameters // [] | .[] | "method.request.\(.in | sub("^query$"; "querystring")).\(.name)=\(.required // false)"] | sort),
       validator: ($v["x-amazon-apigateway-request-validator"] != null), models: ($v.requestBody != null),
       integration: {type: ($i.type // "" | ascii_upcase), httpMethod: $i.httpMethod, uri: $i.uri, passthroughBehavior: ($i.passthroughBehavior // "" | ascii_upcase),
         contentHandling: $i.contentHandling, timeoutInMillis: ($i.timeoutInMillis // 29000), responseTransferMode: ($i.responseTransferMode // "BUFFERED"),
         requestTemplates: ($i.requestTemplates | templates), requestParameters: ($i.requestParameters // {})},
       responses: ([$i.responses // {} | to_entries[] | {pattern: .key, statusCode: .value.statusCode, parameters: (.value.responseParameters // {}), templates: (.value.responseTemplates | templates)}] | sort_by(.pattern))}),
  {gatewayResponses: (.["x-amazon-apigateway-gateway-responses"] // {} | map_values({statusCode, parameters: (.responseParameters // {}), templates: (.responseTemplates | templates)})),
   binaryMediaTypes: (.["x-amazon-apigateway-binary-media-types"] // [] | sort), policy: (.["x-amazon-apigateway-policy"] // null)}
' export-before.json | sort > deployed.txt
jq -c -S --slurpfile authorizers authorizers-now.json --slurpfile gateway gateway-responses-now.json --slurpfile api api-now.json '
  def templates: . // {} | with_entries(select(.value != null));
  (.items[] | .path as $p | .resourceMethods // {} | to_entries[] | .key as $m | .value as $v | ($v.methodIntegration // {}) as $i
    | {path: $p, method: $m, auth: {authorizationType: $v.authorizationType, apiKeyRequired: $v.apiKeyRequired},
       security: ([($authorizers[0].items[] | select(.id == $v.authorizerId) | .name), (if $v.authorizationType == "AWS_IAM" then "sigv4" else empty end), (if $v.apiKeyRequired then "api_key" else empty end)] | sort),
       parameters: ([$v.requestParameters // {} | to_entries[] | "\(.key)=\(.value)"] | sort),
       validator: ($v.requestValidatorId != null), models: (($v.requestModels // {}) | length > 0),
       integration: {type: $i.type, httpMethod: $i.httpMethod, uri: $i.uri, passthroughBehavior: $i.passthroughBehavior,
         contentHandling: $i.contentHandling, timeoutInMillis: ($i.timeoutInMillis // 29000), responseTransferMode: ($i.responseTransferMode // "BUFFERED"),
         requestTemplates: ($i.requestTemplates | templates), requestParameters: ($i.requestParameters // {})},
       responses: ([$i.integrationResponses // {} | .[] | {pattern: (.selectionPattern // "default"), statusCode, parameters: (.responseParameters // {}), templates: (.responseTemplates | templates)}] | sort_by(.pattern))}),
  {gatewayResponses: ([$gateway[0].items[] | select(.defaultResponse == false) | {key: .responseType, value: {statusCode, parameters: (.responseParameters // {}), templates: (.responseTemplates | templates)}}] | from_entries),
   binaryMediaTypes: ($api[0].binaryMediaTypes // [] | sort), policy: ($api[0].policy // null | if . == null then null else gsub("\\\\\""; "\"") | fromjson end)}
' resources-now.json | sort > current.txt
grep -q '"method":' deployed.txt && grep -q '"method":' current.txt || { echo "STOP: the deployed or the current API came back without methods"; exit 1; }
diff deployed.txt current.txt || { echo "STOP: the API has changes that a new deployment would publish"; exit 1; }
echo "OK: nothing else waiting to go live, $(grep -c '"method":' current.txt) methods compared"
CHECK
```

Stop on anything but the `OK` line; a difference is someone else's change waiting to go live. Request models and validators are compared only on whether one is set, not on their content; on 22 October 2026 the API had none.

Create `/destinations`, `/destinations/{proxy+}` and `/sitemap-destinations.xml` under the root resource, each with **GET only, never ANY** (a POST would reach the property create route), authorization `NONE`, integration `AWS_PROXY` to `PropertyHandler`, a Lambda permission per method, and a method throttle (rate 20, burst 40). Then `aws apigateway create-deployment --rest-api-id $API --stage-name default --description "destination pages"`.

Check, with the switch still off:

```bash
B=https://$API.execute-api.eu-north-1.amazonaws.com/default
for p in /destinations /destinations/europe /destinations/europe/ /sitemap-destinations.xml; do
  printf "%-28s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code} %{content_type} loc=%{redirect_url}' "$B$p")"
done
```

Expected: `404 text/html` for the first two and the sitemap, `301` with `loc` ending in `/destinations/europe` for the third, and the existing `/property/...` routes unchanged.
Rollback: `aws apigateway update-stage --rest-api-id $API --stage-name default --patch-operations op=replace,path=/deploymentId,value=$(cat deployment-before.txt)`. Deleting the resources alone does not change the deployed stage.

## 4. Proof on a temporary Amplify app

As on 21 October 2026: a temporary Amplify app with a one-file site and the same rewrite rules as step 7, pointing at the routes of step 3. Set the switch to `true` only for this check, then back to `false`.

Check through the temporary app: the `200`, `404`, `301` and `503` above arrive unchanged with their `Cache-Control`, the sitemap arrives as `application/xml`, and the visitor host arrives in `X-Forwarded-Host`.
Rollback: delete the temporary app and set the switch back to `false`.

## 5. Release to main

The usual release PR from `acceptance` to `main`. Check after its deploy: `PropertyHandler` is `Successful` and the three routes of step 3 still answer as above.

## 6. Backfill the destination mapping

Dry run first, then the same with `--commit`, from a fresh worktree on `acceptance` (see `backend/scripts/backfill-destinations.mjs`).

Check: `complete=true`, `failed=0`, `stale` and `unresolved` reviewed, and the counts match the dry run.
Rollback: none needed while the switch is off; the rows only feed these pages.

## 7. Amplify rules on the real app

`d34jwd0sihmsus` serves `www.domits.com`, `domits.com` and `acceptance.domits.com`, and a rule applies to all of them at once (a source with a host and a path is ignored). `update-app --custom-rules` replaces the whole list, so save it, edit a copy, and compare right before writing:

```bash
aws amplify get-app --app-id d34jwd0sihmsus --query app.customRules --output json > rules-before.json
```

In a copy, add these three rules before the rule that rewrites the app routes to `/index.html`, in this order:

| Source | Target | Type |
|---|---|---|
| `/destinations` | `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/destinations` | `200` |
| `/destinations/<*>` | `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/destinations/<*>` | `200` |
| `/sitemap-destinations.xml` | `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/sitemap-destinations.xml` | `200` |

Read the live list again, make sure it still equals `rules-before.json`, then `aws amplify update-app --app-id d34jwd0sihmsus --custom-rules file://rules-new.json`.

Check on `www.domits.com` and `acceptance.domits.com`, with the switch still off: `/destinations/europe` answers the `404` of the Lambda (with `noindex`, not the app shell), `/destinations/europe/` a `301` to the path without the slash; and `/`, `/about`, a `/listingdetails?ID=...` link, a dashboard route, a static asset, `/robots.txt`, `/sitemap.xml` and `domits.com` to `www` behave as before.
Rollback: read the live list, compare it with the one you wrote, and write `rules-before.json` back.

## 8. Switch on

```bash
aws ssm put-parameter --name $PARAM --type String --value true --overwrite
```

Wait 3 minutes for the containers and the cached `404`s, then check on `www.domits.com`. The check first requires a complete sitemap (`200`, `application/xml`, ending in `</urlset>`, at least one URL, only `www.domits.com/destinations` URLs), then requires every URL in it to answer `200` without a redirect, with a complete page that carries exactly that URL as its canonical. It prints `OK` only when all of that holds:

```bash
bash -euo pipefail <<'CHECK'
curl -sS --max-time 30 -D sitemap-headers.txt -o sitemap.xml https://www.domits.com/sitemap-destinations.xml || { echo "STOP: the sitemap download failed"; exit 1; }
head -1 sitemap-headers.txt | grep -q ' 200' || { echo "STOP: the sitemap does not answer 200"; exit 1; }
grep -i '^content-type:' sitemap-headers.txt | grep -q 'application/xml' || { echo "STOP: the sitemap is not application/xml"; exit 1; }
tail -1 sitemap.xml | grep -q '^</urlset>$' || { echo "STOP: the sitemap is not complete"; exit 1; }
{ grep -o '<loc>[^<]*' sitemap.xml || true; } | cut -c6- > urls.txt
[ -s urls.txt ] || { echo "STOP: the sitemap lists no URL"; exit 1; }
if grep -v -q '^https://www\.domits\.com/destinations' urls.txt; then echo "STOP: the sitemap lists URLs outside www.domits.com/destinations"; exit 1; fi
failed=0
while read -r u; do
  status=$(curl -sS --max-time 30 -o page.html -w '%{http_code}' "$u" < /dev/null) || status=curl-error
  if [ "$status" != 200 ] || ! grep -F -q "<link rel=\"canonical\" href=\"$u\">" page.html || ! tail -1 page.html | grep -q '</html>$'; then
    echo "WRONG $status $u"
    failed=$((failed + 1))
  fi
done < urls.txt
[ "$failed" -eq 0 ] || { echo "STOP: $failed of $(wc -l < urls.txt | tr -d ' ') URLs are wrong"; exit 1; }
echo "OK: the sitemap and all $(wc -l < urls.txt | tr -d ' ') URLs in it answer 200 with their own canonical"
CHECK
```

Stop on anything but the `OK` line. Watch `PropertyHandler` Errors and Duration for the first hour.
Rollback: `aws ssm put-parameter --name $PARAM --type String --value false --overwrite`. Pages answer `404` again within 60 s per container, plus up to 300 s of cache.

## After going live

The `Sitemap:` line for `/sitemap-destinations.xml` in `robots.txt` comes in a separate PR with its own release; submit the sitemap in Search Console only after that.
