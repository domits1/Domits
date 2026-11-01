import fc from "fast-check";
import {
    isAttachmentOfHost,
    parseStoredAttachments,
    findAttachmentOfTask,
} from "../../functions/property-tasks/business/model/taskAttachments.js";

const FILE = "0b6c1d2e-3f40-4a5b-9c6d-7e8f9a0b1c2d";

describe("isAttachmentOfHost", () => {
    it.each([
        `tasks/host-1/${FILE}.jpg`,
        `tasks/host-1/${FILE}.JPEG`,
        `tasks/host-1/${FILE}.`,
    ])("accepts the server-made key %s in the host's folder", (key) => {
        expect(isAttachmentOfHost("host-1", key)).toBe(true);
    });

    it.each([
        ["another host's folder", `tasks/host-2/${FILE}.jpg`],
        ["a folder that only starts with the host id", `tasks/host-10/${FILE}.jpg`],
        ["a sub folder", `tasks/host-1/other/${FILE}.jpg`],
        ["a path that climbs out", `tasks/host-1/../host-2/${FILE}.jpg`],
        ["a slash in the extension", `tasks/host-1/${FILE}./../../host-2/a.jpg`],
        ["a name the server did not make", "tasks/host-1/photo.jpg"],
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
