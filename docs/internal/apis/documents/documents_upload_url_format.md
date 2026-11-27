# Documents API: GET upload-url

Back to the [Documents API](./documents.md).

Gives the signed-in Host or Admin a link to upload one file into their own folder. The link only creates the file in storage. It does not save a document.

## Request

`GET {baseUrl}?action=upload-url&fileType=<type>&fileSize=<bytes>`

Header: `Authorization: <Cognito access token>`, without a `Bearer` prefix.

| Parameter | Required | Meaning |
| --------- | -------- | ------- |
| `action` | Yes | `upload-url` |
| `fileType` | Yes | The MIME type of the file, as the browser reports it |
| `fileSize` | Yes | The size of the file in bytes |

`fileName` and any host in the query are not read.

## Checks

The checks run in this order, after the [authorization](./documents.md#security--authorization). The first that fails answers.

| Check | Answer |
| ----- | ------ |
| `fileType` is one of the types below, exactly, in lower case | 400 `Only PDF, JPG, PNG, WEBP, HEIC, DOCX and XLSX files can be uploaded. Choose a file of one of these types.` |
| `fileSize` is a whole number of bytes, written as 1 to 12 digits | 400 `fileSize must be the size of the file in bytes.` |
| The file is not empty | 400 `An empty file cannot be uploaded. Choose a file that has content.` |
| The file is at most 25 MB (26214400 bytes) | 400 `A document can be at most 25 MB. Choose a smaller file.` |
| `DOCUMENTS_BUCKET` is set on the Lambda | 500 `Something went wrong, please contact support.` The log says `DOCUMENTS_BUCKET is not set` |

| `fileType` | Extension |
| ---------- | --------- |
| `application/pdf` | `pdf` |
| `image/jpeg` | `jpg` |
| `image/png` | `png` |
| `image/webp` | `webp` |
| `image/heic` | `heic` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `docx` |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `xlsx` |

The list and the limit wait for product confirmation. They come from `ALLOWED_DOCUMENT_TYPES` and `MAX_DOCUMENT_BYTES` in `backend/functions/documents/business/validation/uploadValidator.js`, and the messages are built from them: update this page when they change.

## Response

`200`

```json
{
  "uploadUrl": "String",
  "key": "String"
}
```

| Field | Meaning |
| ----- | ------- |
| `uploadUrl` | A signed S3 link for one `PUT` |
| `key` | The name the server gave the file: `documents/<host id>/<new id>.<extension of the type>`. Every request gets a new name |

## Uploading with the link

- Send the file with `PUT uploadUrl`, the body being the file itself.
- Send `Content-Type` equal to `fileType`, and a body of exactly `fileSize` bytes (the browser sets `Content-Length` from it). Both are part of the signature: S3 refuses a `PUT` with another type or size with `403`.
- The link works for 5 minutes. After that S3 refuses it with `403`, and the client asks for a new link.
- Check the answer of the `PUT`. Only a `2xx` means the file arrived. Nothing on the server confirms the upload yet.
- Uploading with the same link again overwrites the same file.
