import fc from "fast-check";
import {
    isAttachmentOfHost,
    attachmentsOfHost,
    assertAttachmentsOfHost,
    parseStoredAttachments,
    newAttachmentFile,
    MAX_ATTACHMENT_BYTES,
} from "../../functions/property-tasks/business/model/taskAttachments.js";

const FILE = "0b6c1d2e-3f40-4a5b-9c6d-7e8f9a0b1c2d";
const OWN = `tasks/host-1/${FILE}.jpg`;
const FOREIGN = `tasks/host-2/${FILE}.jpg`;
const refusal = (message) => expect.objectContaining({ statusCode: 400, message });

describe("isAttachmentOfHost", () => {
    it.each([OWN, `tasks/host-1/${FILE}.`, "tasks/host-1/photo.jpg"])("accepts %s, a file directly in the host's folder", (key) => {
        expect(isAttachmentOfHost("host-1", key)).toBe(true);
    });

    it.each([
        FOREIGN,
        `tasks/host-10/${FILE}.jpg`,
        `tasks/host-1/other/${FILE}.jpg`,
        `tasks/host-1/../host-2/${FILE}.jpg`,
        `${FILE}.jpg`,
        "tasks/host-1/",
        undefined,
        { key: OWN },
    ])("refuses %p", (key) => {
        expect(isAttachmentOfHost("host-1", key)).toBe(false);
    });

    it.each([undefined, ""])("refuses every key for host id %p", (hostId) => {
        expect(isAttachmentOfHost(hostId, `tasks/${hostId}/${FILE}.jpg`)).toBe(false);
    });

    it("never accepts a key made for one host as a key of another host", () => {
        const hostId = fc.stringMatching(/^[a-z0-9-]{1,40}$/);
        fc.assert(fc.property(hostId, hostId, fc.uuid(), (owner, other, file) => {
            fc.pre(owner !== other);
            return !isAttachmentOfHost(other, `tasks/${owner}/${file}.jpg`);
        }));
    });
});

describe("attachmentsOfHost", () => {
    it("keeps only the keys in the host's folder", () => {
        expect(attachmentsOfHost("host-1", [OWN, FOREIGN, `tasks/host-1/x/${FILE}.jpg`])).toEqual([OWN]);
    });
});

describe("assertAttachmentsOfHost", () => {
    it("accepts the host's own keys, and a foreign key only when the task already holds it", () => {
        expect(() => assertAttachmentsOfHost("host-1", [OWN])).not.toThrow();
        expect(() => assertAttachmentsOfHost("host-1", [OWN, FOREIGN], [FOREIGN])).not.toThrow();
    });

    it.each([[[OWN, FOREIGN], []], [[{ key: OWN }], [OWN]]])("refuses %p when the task holds %p", (attachments, held) => {
        expect(() => assertAttachmentsOfHost("host-1", attachments, held)).toThrow(refusal("attachments can only hold files uploaded for this host"));
    });

    it.each([OWN, null, { 0: OWN }])("refuses %p, which is not a list", (attachments) => {
        expect(() => assertAttachmentsOfHost("host-1", attachments)).toThrow(refusal("attachments must be a list of uploaded files"));
    });
});

describe("parseStoredAttachments", () => {
    it.each([
        [null, []],
        ["not json", []],
        [JSON.stringify(OWN), []],
        [JSON.stringify([OWN, 3, null]), [OWN]],
    ])("reads %p as %p", (stored, expected) => {
        expect(parseStoredAttachments(stored)).toEqual(expected);
    });
});

describe("newAttachmentFile", () => {
    it.each([
        ["image/jpeg", "jpg"],
        ["image/png", "png"],
        ["image/webp", "webp"],
        ["image/gif", "gif"],
        ["image/heic", "heic"],
        ["image/heif", "heif"],
        ["application/pdf", "pdf"],
    ])("names a %s file in the host's folder with a new id and .%s", (fileType, extension) => {
        const file = newAttachmentFile("host-1", fileType, "1024");

        expect(file.key).toMatch(new RegExp(`^tasks/host-1/[0-9a-f-]{36}\\.${extension}$`));
        expect(file).toMatchObject({ contentType: fileType, contentLength: 1024 });
        expect(newAttachmentFile("host-1", fileType, "1024").key).not.toBe(file.key);
    });

    it.each(["image/svg+xml", "text/html", "", undefined, "toString", "IMAGE/PNG"])("refuses the file type %p", (fileType) => {
        expect(() => newAttachmentFile("host-1", fileType, "1024")).toThrow(refusal("Only JPG, PNG, WEBP, GIF, HEIC and PDF files can be attached"));
    });

    it.each([undefined, "", "abc", "-1", "1.5", "1e3", 1024])("refuses the size %p", (fileSize) => {
        expect(() => newAttachmentFile("host-1", "image/png", fileSize)).toThrow(refusal("fileSize must be the size of the file in bytes"));
    });

    it("refuses an empty file, accepts exactly 20 MB and refuses one byte more", () => {
        expect(() => newAttachmentFile("host-1", "image/png", "0")).toThrow(refusal("An empty file cannot be attached"));
        expect(newAttachmentFile("host-1", "application/pdf", String(MAX_ATTACHMENT_BYTES)).contentLength).toBe(20 * 1024 * 1024);
        expect(() => newAttachmentFile("host-1", "application/pdf", String(MAX_ATTACHMENT_BYTES + 1))).toThrow(refusal("A file can be at most 20 MB"));
    });
});
