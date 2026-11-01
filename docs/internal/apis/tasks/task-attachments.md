# Tasks: attachments

How the property-tasks API (issue #3520) uploads, shows and removes the files attached to a task. Files live in the `domits-task-attachments` bucket under `tasks/<host id>/`.

Every attachment endpoint works for the host the signed-in user acts for, worked out as for the other task endpoints: `asHostId` counts only when they are an active team member of that host. Nothing else in the request decides the host, the task or the file.

## Uploading a file

`GET ?action=upload-url&fileType=<type>&fileSize=<bytes>`

| Check | Answer |
|---|---|
| `fileType` is `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif` or `application/pdf` | 400 `Only JPG, PNG, WEBP, GIF, HEIC and PDF files can be attached` |
| `fileSize` is a whole number of bytes | 400 `fileSize must be the size of the file in bytes` |
| The file is not empty | 400 `An empty file cannot be attached` |
| The file is at most 20 MB | 400 `A file can be at most 20 MB` |

The server names the file `tasks/<host id>/<new id>.<extension of the type>`. `fileName` is not read. The upload link works for 5 minutes, and only for a `PUT` with exactly the signed `Content-Type` and `Content-Length`. The web checks the answer of that `PUT`, so a file that did not arrive is never saved on the task. A refused file shows its reason, and the form stays open.

## Showing a file

`GET ?action=view-url&taskId=<task id>&key=<file as stored on the task>`

| Check | Answer |
|---|---|
| `taskId` is a task id | 400 `taskId must be the id of a task` |
| `key` is given | 400 `key is required` |
| The task belongs to the host, the file is on that task, and it lies directly in `tasks/<host id>/` | 404 `Attachment not found` |

The link works for 1 hour. The web sends the task id, and `asHostId` in the co-host tasks view. A thumbnail whose link is refused says "Unavailable" and keeps its remove button.

## Saving the list on a task

On create and update, `attachments` must be a list (400 `attachments must be a list of uploaded files`), and every file added must lie directly in the host's folder (400 `attachments can only hold files uploaded for this host`). A file the task already holds is kept as it is. `null` or `[]` clears the list.

## Removing files

- An update removes the files it took off the task only after the task is saved. A refused or failed update, or a completion that another request already made, removes nothing.
- Deleting a task removes its files, then marks the task deleted.
- Only files in the host's own folder are removed from storage.
- A failed removal is logged as `Failed to remove the attachments of task <id>`, or `Failed to remove <n> attachment(s) of task <id>` for files storage could not remove. It does not fail the request, and those files stay in storage. The bucket keeps earlier versions of removed files.

## Not covered yet

- Each save sends the whole list. When two people save the same task's attachments at once, the last save wins, and it can remove a file the other one just added.
- When marking a task deleted fails after its files were removed, the task stays with missing files.
- Files uploaded for a task that is then not saved stay in storage.

## Where the code is

| Layer | File |
|---|---|
| Controller | `backend/functions/property-tasks/controller/controller.js` (`getUploadUrl`, `getViewUrl`) |
| Business | `business/model/taskAttachments.js`, `business/service/taskService.js` |
| Web | `frontend/web/src/features/hostdashboard/services/taskService.js`, `hosttasks/components/AttachmentThumb.js`, `hosttasks/pages/HostTasks.js` |
| Tests | `backend/test/property-tasks/taskAttachments.test.js`, `taskService.attachments.test.js`, `taskService.getUploadUrl.signing.test.js`, `controller.attachments.test.js`; `frontend/web/src/features/hostdashboard/services/taskService.attachments.test.js`, `AttachmentThumb.test.js`, `HostTasks.test.js` |
