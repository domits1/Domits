jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockS3Send = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: (...args) => mockS3Send(...args) })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectsCommand: jest.fn().mockImplementation(function (input) {
        return { input };
    }),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn() }));

const {
    mockGetTaskById,
    mockSaveTaskToDb,
    mockUpdateTaskInDb,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");
const { createTask, updateTask, deleteTask } = require("../../functions/property-tasks/business/service/taskService.js");

const OWN_A = "tasks/host-1/0b6c1d2e-3f40-4a5b-9c6d-7e8f9a0b1c2d.jpg";
const OWN_B = "tasks/host-1/2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60.pdf";
const FOREIGN = "tasks/host-2/1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f.jpg";

const NEW_TASK = { title: "Clean", property_id: "prop-1", property_snapshot_label: "Villa", type: "Cleaning" };
const removedFromStorage = () => mockS3Send.mock.calls.flatMap(([command]) => command.input.Delete.Objects.map(({ Key }) => Key));

describe("attachment keys a task may hold", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
        mockS3Send.mockReset();
        mockS3Send.mockResolvedValue({});
    });

    describe("createTask", () => {
        it("stores files uploaded for the host", async () => {
            await createTask("host-1", { ...NEW_TASK, attachments: [OWN_A, OWN_B] });

            expect(mockSaveTaskToDb).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ host_id: "host-1", attachments: JSON.stringify([OWN_A, OWN_B]) })
            );
        });

        it.each([undefined, null, []])("stores no attachments for %p", async (attachments) => {
            await createTask("host-1", { ...NEW_TASK, attachments });

            expect(mockSaveTaskToDb).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ attachments: null }));
        });

        it("refuses a file of another host's folder and saves nothing", async () => {
            await expect(createTask("host-1", { ...NEW_TASK, attachments: [OWN_A, FOREIGN] })).rejects.toMatchObject({ statusCode: 400 });

            expect(mockSaveTaskToDb).not.toHaveBeenCalled();
        });

        it("refuses attachments that are not a list and saves nothing", async () => {
            await expect(createTask("host-1", { ...NEW_TASK, attachments: OWN_A })).rejects.toMatchObject({ statusCode: 400 });

            expect(mockSaveTaskToDb).not.toHaveBeenCalled();
        });
    });

    describe("updateTask", () => {
        const taskHolding = (keys) => ({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null, attachments: JSON.stringify(keys) });

        it("refuses a file of another host's folder, and removes and writes nothing", async () => {
            mockGetTaskById.mockResolvedValue(taskHolding([OWN_A]));

            await expect(updateTask("host-1", "task-1", { attachments: [FOREIGN] })).rejects.toMatchObject({ statusCode: 400 });

            expect(mockS3Send).not.toHaveBeenCalled();
            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("refuses attachments that are not a list, and removes and writes nothing", async () => {
            mockGetTaskById.mockResolvedValue(taskHolding([OWN_A]));

            await expect(updateTask("host-1", "task-1", { attachments: "none" })).rejects.toMatchObject({ statusCode: 400 });

            expect(mockS3Send).not.toHaveBeenCalled();
            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("keeps a file from another folder the task already holds", async () => {
            mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, FOREIGN]));

            await updateTask("host-1", "task-1", { attachments: [OWN_A, FOREIGN, OWN_B] });

            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
                expect.anything(),
                "task-1",
                expect.objectContaining({ attachments: JSON.stringify([OWN_A, FOREIGN, OWN_B]) })
            );
            expect(mockS3Send).not.toHaveBeenCalled();
        });

        it("takes a file from another folder off the task without removing it from storage", async () => {
            mockGetTaskById.mockResolvedValue(taskHolding([OWN_A, FOREIGN]));

            await updateTask("host-1", "task-1", { attachments: [] });

            expect(removedFromStorage()).toEqual([OWN_A]);
            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ attachments: null }));
        });

        it("clears the attachments for null, removing the host's files", async () => {
            mockGetTaskById.mockResolvedValue(taskHolding([OWN_A]));

            await updateTask("host-1", "task-1", { attachments: null });

            expect(removedFromStorage()).toEqual([OWN_A]);
            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ attachments: null }));
        });
    });

    describe("deleteTask", () => {
        it("removes only the files in the host's own folder", async () => {
            mockGetTaskById.mockResolvedValue({
                id: "task-1",
                host_id: "host-1",
                status: "Pending",
                due_date: null,
                attachments: JSON.stringify([OWN_A, FOREIGN, "tasks/host-1/sub/x.jpg"]),
            });

            await deleteTask("host-1", "task-1");

            expect(removedFromStorage()).toEqual([OWN_A]);
            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", expect.objectContaining({ is_legacy: true }));
        });

        it("removes nothing from storage when no file is in the host's folder", async () => {
            mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null, attachments: JSON.stringify([FOREIGN]) });

            await deleteTask("host-1", "task-1");

            expect(mockS3Send).not.toHaveBeenCalled();
        });
    });
});
