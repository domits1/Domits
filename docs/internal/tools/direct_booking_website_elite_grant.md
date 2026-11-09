# Granting the Elite website plan (#3099)

`POST /property/website/rate-plan/grant` on `PropertyHandler` gives a host the Elite website plan for a fixed period, without payment. While checkout is off, it is the only way a host gets Elite.

The route is reachable only after the API Gateway steps at the end of this page. Until then API Gateway has no method for this path, so a request never reaches the Lambda.

## Who may grant

- The people on `PROPERTY_REVIEW_ADMIN_USER_IDS`, the same list that decides who reviews properties. See [property_review_admin_allowlist.md](property_review_admin_allowlist.md) for how the list is set.
- The admin is read from the access token. Nothing in the body can name the admin; an `actorId` in the body is ignored.
- A missing or empty list means nobody can grant.
- An admin cannot grant his own account.
- A host cannot grant himself: a host who is not on the list gets `403` before the body is read.
- Who may grant is decided in one controller method, `authorizeWebsitePlanAdmin`. A separate list later is a change there plus one Lambda variable.

## Request

Headers: `Authorization` with the admin's Cognito access token (the same value the host dashboard sends), and `Content-Type: application/json`.

| Field | Rule |
| --- | --- |
| `accountId` | The host's Cognito `Username`, the id PropertyHandler uses as `hostId`. 1 to 255 characters. Must be a user in the `Host` group, matched exactly (an email address does not match). |
| `effectiveUntil` | ISO 8601 date and time with a time zone, for example `2027-05-01T00:00:00Z`. In the future, at most 366 days ahead. |
| `reason` | 1 to 500 characters. Stored in the audit row. |

Other fields are ignored.

## Answers

Every answer is JSON with `Cache-Control: no-store`.

| Status | Body | When |
| --- | --- | --- |
| `200` | `{ "action", "plan" }` | `action` is `granted`, or `extended` when a running Elite plan was replaced. `plan` is the new plan, as `GET /property/website/rate-plan` shows it. |
| `400` | `{ "message" }` | The body is not a JSON object, or a field breaks a rule above. |
| `401` | `{ "message" }` | No token, or Cognito does not accept it (expired, signed out, invalid). |
| `403` | `{ "message" }` | The caller is not on the admin list, or names his own account. |
| `404` | `{ "message" }` | No user with this id, or the user is not a `Host`. |
| `409` | `{ "message", "code" }` | `paid_plan_active`: the host pays for a subscription, nothing changed. `conflict`: the plan of this host changed at the same moment, nothing changed; read the plan and try again. |
| `503` | `{ "message" }` | The plan table is not available. |
| `500` | `{ "message" }` | Anything else. The cause is in the Lambda log, never in the answer. |

Checks run in this order: token, admin list, body, own account, host lookup, then the write. A refused request writes nothing.

## What a grant writes

One database transaction:

1. the host's current plan rows are set to `EXPIRED`, ending now;
2. a new row: `elite`, price 0, `ACTIVE`, no Stripe ids, ending at `effectiveUntil`;
3. one `standalone_site_event` row of type `WEBSITE_PLAN_GRANTED` for the host, with the admin, the new plan id, the replaced plan ids, the end date and the reason.

If any step fails, nothing is written. A grant for a host who already has a grant replaces it, and the new end date holds, also when it is earlier. The Lambda logs one `website_plan_grant` line with the admin, the host, the plan id and the end date; the reason stays in the audit row only.

If the call times out or answers `500` after it reached the database, the grant may be in. Granting again is safe: it answers `extended` and writes a second audit row.

## When a grant ends

Nothing runs at the end date. From then on the plan no longer counts as current, and the host's next plan read gives him Essentials. Until the revoke route exists, a grant can only be shortened by granting again with an earlier end date. A host who switches to Essentials himself through `PATCH /property/website/rate-plan` ends the grant at once; that writes no grant event.

## The call

Use fake ids in anything you commit or paste. Real ids go in the terminal only.

```bash
read -rs ADMIN_TOKEN
B=https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default
curl -s -w ' %{http_code}\n' -X POST "$B/property/website/rate-plan/grant" \
  -H "Authorization: $ADMIN_TOKEN" -H "Content-Type: application/json" \
  --data '{"accountId":"host-1","effectiveUntil":"2027-05-01T00:00:00Z","reason":"Pilot host for the Elite website"}'
unset ADMIN_TOKEN
```

`read -rs` keeps the token out of the shell history and off the screen.

## Making the route reachable (API Gateway)

Only after the code is merged into `acceptance`, deployed, and part of a release to `main` with a green deploy there too. Both branches deploy the same `PropertyHandler`, so a `main` deploy without this code would send a POST on this path to property create.

```bash
export AWS_PROFILE=domits AWS_REGION=eu-north-1 API=wkmwpwurbc
```

1. Prove that the live Lambda routes the grant. This call has no token, so it stops at the first check and writes nothing:

   ```bash
   aws lambda invoke --function-name PropertyHandler --cli-binary-format raw-in-base64-out \
     --payload '{"httpMethod":"POST","resource":"/property/website/rate-plan/grant","headers":{}}' grant-route-check.json > /dev/null
   jq -r '.statusCode, .headers["Cache-Control"], .body' grant-route-check.json
   ```

   Expected: `401`, `no-store`, `{"message":"You must be logged in."}`. Anything else: stop, the deployed code does not route the grant.

2. Save the current deployment and run the "nothing else waiting to go live" check of [destination_pages_runbook.md](destination_pages_runbook.md), step 3. Stop on anything but its `OK` line.

3. Read the rate plan resource and the integration that `PATCH` uses:

   ```bash
   PARENT=$(aws apigateway get-resources --rest-api-id $API --limit 500 --query "items[?path=='/property/website/rate-plan'].id" --output text)
   aws apigateway get-method --rest-api-id $API --resource-id $PARENT --http-method PATCH > rate-plan-patch-method.json
   aws apigateway get-method --rest-api-id $API --resource-id $PARENT --http-method OPTIONS > rate-plan-options-method.json
   aws apigateway get-integration --rest-api-id $API --resource-id $PARENT --http-method OPTIONS > rate-plan-options-integration.json
   aws apigateway get-integration-response --rest-api-id $API --resource-id $PARENT --http-method OPTIONS --status-code 200 > rate-plan-options-integration-response.json
   URI=$(aws apigateway get-integration --rest-api-id $API --resource-id $PARENT --http-method PATCH --query uri --output text)
   echo "$PARENT"; echo "$URI"; jq -r '.authorizationType, .apiKeyRequired' rate-plan-patch-method.json
   jq -r '.type, (.requestTemplates // {} | keys | join(","))' rate-plan-options-integration.json
   ```

   Stop unless `PARENT` is one id, `URI` ends in `:function:PropertyHandler/invocations` with no alias, the authorization type is `NONE`, `apiKeyRequired` is `false`, and the `OPTIONS` integration is `MOCK` with at least one request template.

4. Create the resource and the `POST` method. POST only, never `ANY`, `PATCH` or `DELETE`:

   ```bash
   GRANT=$(aws apigateway create-resource --rest-api-id $API --parent-id $PARENT --path-part grant --query id --output text)
   echo "$GRANT" > grant-resource-id.txt
   aws apigateway put-method --rest-api-id $API --resource-id $GRANT --http-method POST --authorization-type NONE
   aws apigateway put-integration --rest-api-id $API --resource-id $GRANT --http-method POST --type AWS_PROXY --integration-http-method POST --uri "$URI"
   aws lambda add-permission --function-name PropertyHandler --statement-id website-rate-plan-grant-post --action lambda:InvokeFunction \
     --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:eu-north-1:115462458880:$API/*/POST/property/website/rate-plan/grant"
   ```

5. Copy the `OPTIONS` method of the rate plan resource, with `POST,OPTIONS` as the allowed methods:

   ```bash
   aws apigateway put-method --rest-api-id $API --resource-id $GRANT --http-method OPTIONS --authorization-type NONE
   aws apigateway put-method-response --rest-api-id $API --resource-id $GRANT --http-method OPTIONS --status-code 200 \
     --response-parameters "$(jq -c '.methodResponses["200"].responseParameters' rate-plan-options-method.json)"
   aws apigateway put-integration --rest-api-id $API --resource-id $GRANT --http-method OPTIONS --type MOCK \
     --request-templates "$(jq -c '.requestTemplates' rate-plan-options-integration.json)"
   aws apigateway put-integration-response --rest-api-id $API --resource-id $GRANT --http-method OPTIONS --status-code 200 \
     --response-parameters "$(jq -c --arg methods "'POST,OPTIONS'" '.responseParameters | .["method.response.header.Access-Control-Allow-Methods"] = $methods' rate-plan-options-integration-response.json)"
   ```

6. Deploy:

   ```bash
   aws apigateway create-deployment --rest-api-id $API --stage-name default --description "website plan grant"
   ```

Check:

```bash
B=https://$API.execute-api.eu-north-1.amazonaws.com/default
curl -s -o /dev/null -D - -X OPTIONS "$B/property/website/rate-plan/grant" -H "Origin: https://www.domits.com" -H "Access-Control-Request-Method: POST" | grep -i "^HTTP\|allow-methods"
curl -s -w ' %{http_code}\n' -X POST "$B/property/website/rate-plan/grant" -H "Content-Type: application/json" --data '{}'
read -rs HOST_TOKEN
curl -s -w ' %{http_code}\n' -X POST "$B/property/website/rate-plan/grant" -H "Authorization: $HOST_TOKEN" -H "Content-Type: application/json" --data '{}'
curl -s -o /dev/null -w '%{http_code}\n' "$B/property/website/rate-plan" -H "Authorization: $HOST_TOKEN"
unset HOST_TOKEN
```

Expected: the preflight answers `200` with `POST,OPTIONS`; without a token `{"message":"You must be logged in."} 401`; with the token of a host who is not an admin `{"message":"You are not allowed to grant website plans."} 403` (this exact text proves the request reached the grant); `GET /property/website/rate-plan` still answers `200` for that host. That GET is the same read the plan card makes, and it creates an Essentials row for a host who has no plan yet, so use a host who already has one.

Rollback, in this order:

```bash
aws apigateway update-stage --rest-api-id $API --stage-name default --patch-operations op=replace,path=/deploymentId,value=$(cat deployment-before.txt)
aws apigateway delete-resource --rest-api-id $API --resource-id $(cat grant-resource-id.txt)
aws lambda remove-permission --function-name PropertyHandler --statement-id website-rate-plan-grant-post
```

The stage rollback makes the route unreachable at once. Deleting the resource keeps it out of the next deployment.
