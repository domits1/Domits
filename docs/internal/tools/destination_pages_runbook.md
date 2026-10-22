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
| The switch or the database slow (5 s for both together) or down, or more than 50,000 sitemap entries | `503`, `no-store`, `Retry-After: 60` |

The host in canonicals and sitemap URLs comes from `X-Forwarded-Host`, but only `www.domits.com` and `acceptance.domits.com` are used; anything else becomes `www.domits.com`. The switch and the destination tree are kept 60 s per container. A destination that loses its last listing can stay in the sitemap for up to 60 s plus the 300 s sitemap cache; its page answers `404` in the meantime. A sitemap holds at most 50,000 URLs; above that the route answers `503` and the log names the limit, which is the moment to split it with `buildSitemapIndex`.

## Before starting

- The serving PRs are merged into `acceptance`, deployed, and part of a release to `main`. Both branches deploy the same `PropertyHandler`, so a `main` deploy without this code would remove the routes again.
- `main.destination`, `main.property_destination` and their `test` copies exist (see `dsql_destination_runbook.md`).
- AWS CLI on profile `domits`, region `eu-north-1`.

```bash
export AWS_PROFILE=domits AWS_REGION=eu-north-1
API=wkmwpwurbc
ROLE=domits-property-handler
PARAM=/destinations/pages/enabled
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

Save the current deployment first, and make sure the API has no changes waiting that a new deployment would publish along with these routes:

```bash
aws apigateway get-stage --rest-api-id $API --stage-name default --query deploymentId --output text > deployment-before.txt
aws apigateway get-export --rest-api-id $API --stage-name default --export-type oas30 export-before.json
```

Compare the paths in `export-before.json` with `aws apigateway get-resources --rest-api-id $API --limit 500 --query 'items[].path'`; stop if they differ.

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

Wait a minute for the containers, then check on `www.domits.com`: `/destinations` answers `200`, a city page `200` with a canonical equal to its URL, and every URL in `/sitemap-destinations.xml` answers `200` without a redirect and with that same canonical:

```bash
curl -s https://www.domits.com/sitemap-destinations.xml | grep -o '<loc>[^<]*' | cut -c6- | while read u; do
  printf "%s %s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$(curl -s "$u" | grep -c "rel=\"canonical\" href=\"$u\"")" "$u"
done | grep -v '^200 1 '
```

Expected: no output. Watch `PropertyHandler` Errors and Duration for the first hour.
Rollback: `aws ssm put-parameter --name $PARAM --type String --value false --overwrite`. Pages answer `404` again within 60 s per container, plus up to 300 s of cache.

## After going live

The `Sitemap:` line for `/sitemap-destinations.xml` in `robots.txt` comes in a separate PR with its own release; submit the sitemap in Search Console only after that.
