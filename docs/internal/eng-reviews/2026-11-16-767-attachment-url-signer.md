# Attachment URL signer helper: engineering review

Branch: `fix/767-sign-chat-attachment-urls`
Reviewed: the staged diff for the helper commit (3 files, +270)
Problem: chat attachments live in the private bucket `general-messaging-production-attachments`, and messages store the raw `https://<bucket>.s3.amazonaws.com/images/<id>.<ext>` URL. The browser gets 403 AccessDenied.

## Decision

Keep the bucket private. `util/attachmentUrlSigner.js` turns a URL from that bucket into a presigned GET URL valid for one hour (`@aws-sdk/s3-request-presigner`). The database keeps the raw URL, so old messages work too. This commit adds only the helper; the next commits call it where messages leave the service.

- A URL is signed only when its scheme is `https` and its host is exactly `<bucket>.s3.amazonaws.com` or `<bucket>.s3.<region>.amazonaws.com`. Any other URL (another host, another bucket, a lookalike suffix, `http`, `blob:`) is returned unchanged.
- Bucket and region default to `general-messaging-production-attachments` and `eu-north-1`, with optional overrides `MESSAGING_ATTACHMENTS_BUCKET` and `MESSAGING_ATTACHMENTS_REGION`. No AWS configuration is added.
- Options weighed for a signing failure: throw (one bad URL would fail the whole message list), or log and return the raw URL (chosen: the message still loads and only that image stays broken).
- `attachments` is a `text` column, so the helper accepts an array or a JSON string and returns the same shape. A string that is not a JSON array is returned unchanged.
- The S3 client is created on first use and reused. Presigning is local computation, so a list of messages adds no network calls.
- Consequence accepted: a signed URL stops working after an hour. A chat left open longer shows a broken image until the next fetch signs it again.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `attachmentUrlSigner.js` (`return decodeURIComponent(parsed.pathname.slice(1)) \|\| null;`): any chat participant can post another object's URL from the same bucket and the server will sign it. | 7/10 | Accepted. Keys are random ids and the Lambda role can already read the bucket. Other buckets and hosts are never signed. |
| `[P3]` `attachmentUrlSigner.js` (`expiresIn: SIGNED_URL_TTL_SECONDS`): a presigned URL is also limited by the lifetime of the Lambda's temporary credentials, so it can expire before the hour. | 5/10 | Accepted; the next fetch signs again. |
| `[P3]` `attachmentUrlSigner.js` (`BUCKET` and `REGION` read at module load): changing the env var needs a cold start. | 8/10 | Accepted; Lambda env changes already restart the function. |

## Not in scope

- Calling the helper. `messageService.js`, `publishRealtimeMessage.js` and the WhatsApp adapter follow in the next commits.
- The browser-side live message and the local preview, which live in the frontend.
- Changing the upload Lambda, the bucket policy or the IAM role.

## What already exists

- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are in `backend/package.json`, which the Lambda build uses. They are also listed in the function's `package.json`, as other functions do.
- `PropertyHandler` and `company-profile` already use `getSignedUrl`; the same call is reused.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| `getSignedUrl` throws | Missing credentials or SDK error | Yes | Logs and returns the raw URL | One broken image, message intact |
| Malformed percent-encoding in the key | `decodeURIComponent` throws | Yes | Caught, returns the URL unchanged | Broken image |
| Lookalike host such as `<bucket>.s3.amazonaws.com.evil.com` | Signing a foreign URL | Yes | Exact host match | Unchanged URL |
| `attachments` is a JSON string | Not signed | Yes | Parsed, signed, stringified | Signed image |
| `attachments` is invalid JSON | Exception | Yes | Returned unchanged | Unchanged |

## Verification

`functions/UnifiedMessaging/util`: 1 suite, 32 tests passed. Full backend run: 431 suites and 6129 tests passed. Three suites fail locally for reasons unrelated to messaging: `test/General-Bookings-CRUD-Bookings-develop/lambdaRepository.test.js` and `test/PropertyHandler/builder-unit-unhappy-path.test.js` need AWS credentials, and `test/PropertyHandler/end-to-end.test.js` needs a live database (excluded in CI).
