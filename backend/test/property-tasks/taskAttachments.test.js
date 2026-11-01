import fc from "fast-check";
import {
    isAttachmentOfHost,
    attachmentsOfHost,
    assertAttachmentsOfHost,
    parseStoredAttachments,
    findAttachmentOfTask,
} from "../../functions/property-tasks/business/model/taskAttachments.js";

const FILE = "0b6c1d2e-3f40-4a5b-9c6d-7e8f9a0b1c2d";

describe("isAttachmentOfHost", () => {
    it.each([
        `tasks/host-1/${FILE}.jpg`,
        `tasks/host-1/${FILE}.JPEG`,
        `tasks/host-1/${FILE}.`,
        "tasks/host-1/photo.jpg",
    ])("accepts %s, a file directly in the host's folder", (key) => {
        expect(isAttachmentOfHost("host-1", key)).toBe(true);
    });

    it.each([
        ["another host's folder", `tasks/host-2/${FILE}.jpg`],
        ["a folder that only starts with the host id", `tasks/host-10/${FILE}.jpg`],
        ["a sub folder", `tasks/host-1/other/${FILE}.jpg`],
        ["a path that climbs out", `tasks/host-1/../host-2/${FILE}.jpg`],
        ["a slash in the extension", `tasks/host-1/${FILE}./../../host-2/a.jpg`],
        ["no folder", `${FILE}.jpg`],
        ["the folder alone", "tasks/host-1/"],
    ])("refuses %s", (_label, key) => {
        expect(isAttachmentOfHost("host-1", key)).toBe(false);
    });

    it.each([undefined, null, "", 7])("refuses every key for host id %p", (hostId) => {
        expect(isAttachmentOfHost(hostId, `tasks/${hostId}/${FILE}.jpg`)).toBe(false);
    });

    it.each([undefined, null, 7, { key: "x" }])("refuses key %p", (key) => {
        expect(isAttachmentOfHost("host-1", key)).toBe(false);
    });

    it("never accepts a key made for one host as a key of another host", () => {
        const hostId = fc.stringMatching(/^[a-z0-9-]{1,40}$/);
        fc.assert(
            fc.property(hostId, hostId, fc.uuid(), (owner, other, file) => {
                fc.pre(owner !== other);
                return isAttachmentOfHost(other, `tasks/${owner}/${file}.jpg`) === false;
            })
        );
    });
});

describe("attachmentsOfHost", () => {
    it("keeps only the keys in the host's folder", () => {
        const own = `tasks/host-1/${FILE}.jpg`;
        expect(attachmentsOfHost("host-1", [own, `tasks/host-2/${FILE}.jpg`, `tasks/host-1/x/${FILE}.jpg`])).toEqual([own]);
    });
});

describe("assertAttachmentsOfHost", () => {
    const own = `tasks/host-1/${FILE}.jpg`;
    const foreign = `tasks/host-2/${FILE}.jpg`;

    it("accepts keys in the host's folder", () => {
        expect(() => assertAttachmentsOfHost("host-1", [own])).not.toThrow();
        expect(() => assertAttachmentsOfHost("host-1", [])).not.toThrow();
    });

    it("refuses a key outside the host's folder with a 400", () => {
        expect(() => assertAttachmentsOfHost("host-1", [own, foreign])).toThrow(expect.objectContaining({
            statusCode: 400,
            message: "attachments can only hold files uploaded for this host",
        }));
    });

    it("accepts a key outside the folder only when the task already holds it", () => {
        expect(() => assertAttachmentsOfHost("host-1", [own, foreign], [foreign])).not.toThrow();
    });

    it.each([own, null, { 0: own }, 3])("refuses %p, which is not a list", (attachments) => {
        expect(() => assertAttachmentsOfHost("host-1", attachments)).toThrow(expect.objectContaining({
            statusCode: 400,
            message: "attachments must be a list of uploaded files",
        }));
    });

    it("refuses a list entry that is not a key", () => {
        expect(() => assertAttachmentsOfHost("host-1", [{ key: own }], [own])).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
});

describe("parseStoredAttachments", () => {
    it.each([
        [null, []],
        ["", []],
        ["not json", []],
        [JSON.stringify("tasks/host-1/a.jpg"), []],
        [JSON.stringify(["tasks/host-1/a.jpg", 3, null]), ["tasks/host-1/a.jpg"]],
    ])("reads %p as %p", (stored, expected) => {
        expect(parseStoredAttachments(stored)).toEqual(expected);
    });
});

describe("findAttachmentOfTask", () => {
    const key = `tasks/host-1/${FILE}.jpg`;

    it("returns the key as it is stored on the task", () => {
        expect(findAttachmentOfTask("host-1", { attachments: JSON.stringify([key]) }, key)).toBe(key);
    });

    it("throws a 404 when there is no task", () => {
        expect(() => findAttachmentOfTask("host-1", null, key)).toThrow(expect.objectContaining({ statusCode: 404 }));
    });
});
