# feat(documents): upload-url endpoint of the documents API

Pull request: (to be opened)
Issue: #3870, split PR D1 (the first route of the documents API; the routes that use the tables follow in D2)
Reviewed: working tree on `3870-documents-upload-url`, on top of acceptance `f526b9e09`
Result: 1 blocking, fixed

## What changed

```
GET ?action=upload-url ──▶ index.js (route or 405) ──▶ Controller.authorize ──▶ AuthManager ──▶ Cognito GetUser
                                                            │ Host/Admin, host = Username (otherwise 403)
                                                            ▼
                                      UploadService ──▶ uploadValidator (400s)
                                            │ key = documents/<host>/<uuid>.<ext>
                                            ▼
                                      StorageRepository ──▶ presigned PUT, 300 s ──▶ { uploadUrl, key }
```

A new Lambda, `backend/functions/documents/`, with one route. The structure, the auth and the response helper follow `property-owners`; the presigned PUT follows `property-tasks`. The API is described in [documents.md](../apis/documents/documents.md), including the reasons behind its less obvious choices, since the code holds no comments.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (8/10) | backend/functions/documents/data/storageRepository.js:17 | The client was created as `new S3Client({})`. The SDK version in the lockfile (3.1009.0) then adds `x-amz-checksum-crc32=AAAAAA==`, the checksum of an empty body, to every presigned PUT. S3 compares the body with it and refuses every real file with `400 BadDigest`, while the API answers `200` with the link | Fixed: the client is created with `requestChecksumCalculation: "WHEN_REQUIRED"`, the region still from `AWS_REGION`. `storageRepository.signing.test.js:51` fails when a link carries any parameter whose name contains `checksum`; removing the option makes it fail (checked). Not yet tried against a real bucket: try one upload on acceptance after the AWS setup |
| P3 (7/10) | docs/internal/apis/documents/documents.md:32 | The setup table gave "the Lambda's role" `s3:PutObject`. `createLambda` assigns the shared `General-Lambda-Function` role, so the permission would reach every function on it | Role chosen during the AWS setup: the shared General-Lambda-Function role. It has AmazonS3FullAccess, so the narrower statement adds nothing; locking the bucket to this Lambda needs a dedicated role and a bucket policy, raised to the team. |
| P3 (7/10) | backend/functions/documents/business/service/uploadService.js:14 | Upload links are not limited, and a file uploaded but never saved as a document stays in storage, so a Host can fill the bucket | Accepted for D1. Follow-up in D2: a lifecycle rule for unsaved files, or a check when a document is saved |
| P4 (5/10) | backend/functions/documents/data/storageRepository.js:6 | `content-length` in `SIGNED_UPLOAD_HEADERS` changes nothing: with `ContentLength` set the SDK signs it anyway. Removing it from the set is an equivalent mutant; removing `content-type` is caught by the signing test | Accepted, statement of intent |
| P4 (5/10) | docs/internal/apis/documents/documents_upload_url_format.md:27 | The type list and the messages are written out, and drift when `ALLOWED_DOCUMENT_TYPES` or `MAX_DOCUMENT_BYTES` change | Accepted. The page says to update it with the constants |

## Checks

- Mutations, each restored byte-identically: allowing a third group, reading the host from the query, accepting `fileSize=0`, signing without `ContentLength`, not signing `content-type`, and creating the S3 client without the checksum option each make a test fail. Dropping `content-length` from the signed headers changes no signature (the P4 above).
- Duplication: the longest token run shared with `backend/functions` and `backend/test` stays below the CPD threshold of 100 tokens and 10 lines.

## Not in scope

- `property-tasks` has the same checksum issue: `backend/functions/property-tasks/business/service/taskService.js:21` creates `new S3Client({ region: "eu-north-1" })` and signs task attachment uploads the same way. Raised separately.
- AmazonS3FullAccess on the shared Lambda role gives every function access to every bucket. Raised to the team.
- Whether users can write their own `custom:group` is a setting of the Cognito app client, outside the repository. `controller.js:19` trusts it, as `property-owners` and `property-tasks` do. Asked to the team.
- A Cognito username containing `/` would place a file under another host's folder (`uploadService.js:14`). Accepted, because the usernames are sub UUIDs.
- Confirming an upload on the server (`HeadObject`) belongs to saving a document in D2.
- Co-hosts acting for a host are not supported; Host and Admin only.
- A Cognito helper in `backend/functions/.shared/` would remove the repeated auth code, but any change there redeploys every Lambda.
