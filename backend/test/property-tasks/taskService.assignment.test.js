jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const {
    mockGetTaskById,
    mockSaveTaskToDb,
    mockUpdateTaskInDb,
    mockGetTeamMemberById,
    resetTaskRepositoryMocks,
} = require("./taskRepositoryTestDoubles.js");

const { createTask, updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

const baseTaskData = {
    property_id: "prop-1",
    property_snapshot_label: "Villa Sunshine",
    title: "Clean the villa",
    type: "Cleaning",
};

describe("task assignment", () => {
    beforeEach(() => {
        resetTaskRepositoryMocks();
    });

    describe("createTask", () => {
        it("rejects a team member that does not belong to this host", async () => {
            mockGetTeamMemberById.mockResolvedValue(null);

            await expect(
                createTask("host-1", { ...baseTaskData, assignee_team_member_id: "550e8400-e29b-41d4-a716-446655440000" })
            ).rejects.toThrow(/assignee_team_member_id/);

            expect(mockGetTeamMemberById).toHaveBeenCalledWith(
                expect.anything(), "550e8400-e29b-41d4-a716-446655440000", "host-1"
            );
            expect(mockSaveTaskToDb).not.toHaveBeenCalled();
        });

        it("derives assignee_name from the looked-up team member, not client input", async () => {
            mockGetTeamMemberById.mockResolvedValue({
                id: "550e8400-e29b-41d4-a716-446655440000",
                host_id: "host-1",
                member_email: "housekeeper@example.com",
            });

            await createTask("host-1", {
                ...baseTaskData,
                assignee_team_member_id: "550e8400-e29b-41d4-a716-446655440000",
                assignee_name: "Spoofed Name",
            });

            expect(mockSaveTaskToDb).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    assignee_team_member_id: "550e8400-e29b-41d4-a716-446655440000",
                    assignee_name: "housekeeper@example.com",
                })
            );
        });
    });

    describe("updateTask", () => {
        beforeEach(() => {
            mockGetTaskById.mockResolvedValue({
                id: "task-1",
                host_id: "host-1",
                status: "Pending",
                due_date: null,
            });
        });

        it("rejects a team member that does not belong to this host", async () => {
            mockGetTeamMemberById.mockResolvedValue(null);

            await expect(
                updateTask("host-1", "task-1", { assignee_team_member_id: "550e8400-e29b-41d4-a716-446655440000" })
            ).rejects.toThrow(/assignee_team_member_id/);

            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("rejects a malformed assignee_team_member_id without querying the database", async () => {
            await expect(
                updateTask("host-1", "task-1", { assignee_team_member_id: "not-a-uuid" })
            ).rejects.toThrow(/assignee_team_member_id must be a valid UUID/);

            expect(mockGetTeamMemberById).not.toHaveBeenCalled();
            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
        });

        it("derives assignee_name from the looked-up team member on reassignment", async () => {
            mockGetTeamMemberById.mockResolvedValue({
                id: "550e8400-e29b-41d4-a716-446655440000",
                host_id: "host-1",
                member_email: "maintenance@example.com",
            });

            await updateTask("host-1", "task-1", { assignee_team_member_id: "550e8400-e29b-41d4-a716-446655440000" });

            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
                expect.anything(),
                "task-1",
                expect.objectContaining({
                    assignee_team_member_id: "550e8400-e29b-41d4-a716-446655440000",
                    assignee_name: "maintenance@example.com",
                })
            );
        });

        it("clears assignee_name when assignee_team_member_id is unassigned", async () => {
            await updateTask("host-1", "task-1", { assignee_team_member_id: null });

            expect(mockGetTeamMemberById).not.toHaveBeenCalled();
            expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
                expect.anything(),
                "task-1",
                expect.objectContaining({ assignee_team_member_id: null, assignee_name: null })
            );
        });
    });
});
