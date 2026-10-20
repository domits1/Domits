jest.mock("database", () => require("./taskRepositoryTestDoubles.js").databaseMock);
jest.mock("../../functions/property-tasks/data/taskRepository.js", () => require("./taskRepositoryTestDoubles.js").taskRepositoryMock);

const mockNotifyTaskAssigned = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskNotificationService.js", () => ({
    notifyTaskAssigned: (...args) => mockNotifyTaskAssigned(...args),
}));

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
                status: "active",
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

    describe("a team member whose invite is not accepted yet", () => {
        const memberId = "550e8400-e29b-41d4-a716-446655440000";
        const pendingMember = { id: memberId, host_id: "host-1", status: "pending", member_email: "invited@example.com" };

        it("cannot be given a new task", async () => {
            mockGetTeamMemberById.mockResolvedValue(pendingMember);

            await expect(
                createTask("host-1", { ...baseTaskData, assignee_team_member_id: memberId })
            ).rejects.toThrow(/active team member/);

            expect(mockSaveTaskToDb).not.toHaveBeenCalled();
            expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
        });

        it("cannot be assigned an existing task", async () => {
            mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null });
            mockGetTeamMemberById.mockResolvedValue(pendingMember);

            await expect(
                updateTask("host-1", "task-1", { assignee_team_member_id: memberId })
            ).rejects.toThrow(/active team member/);

            expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
            expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
        });
    });

    describe("createTask notification", () => {
        const memberId = "550e8400-e29b-41d4-a716-446655440000";

        beforeEach(() => {
            mockGetTeamMemberById.mockResolvedValue({ id: memberId, host_id: "host-1", status: "active", member_email: "housekeeper@example.com" });
        });

        it("notifies the assignee with the saved task", async () => {
            await createTask("host-1", { ...baseTaskData, assignee_team_member_id: memberId });

            expect(mockNotifyTaskAssigned).toHaveBeenCalledTimes(1);
            expect(mockNotifyTaskAssigned).toHaveBeenCalledWith(
                "host-1",
                expect.objectContaining({ id: "task-1", assignee_team_member_id: memberId })
            );
        });

        it("does not notify anyone when the task has no assignee", async () => {
            await createTask("host-1", baseTaskData);

            expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
        });

        it("does not notify when the task could not be saved", async () => {
            mockSaveTaskToDb.mockRejectedValue(new Error("database down"));

            await expect(
                createTask("host-1", { ...baseTaskData, assignee_team_member_id: memberId })
            ).rejects.toThrow("database down");

            expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
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

        describe("notification", () => {
            const memberId = "550e8400-e29b-41d4-a716-446655440000";
            const otherMemberId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

            beforeEach(() => {
                mockGetTeamMemberById.mockResolvedValue({ id: memberId, host_id: "host-1", status: "active", member_email: "maintenance@example.com" });
            });

            it("notifies the new assignee with the task as it is after the update", async () => {
                await updateTask("host-1", "task-1", { assignee_team_member_id: memberId });

                expect(mockNotifyTaskAssigned).toHaveBeenCalledTimes(1);
                expect(mockNotifyTaskAssigned).toHaveBeenCalledWith(
                    "host-1",
                    expect.objectContaining({ id: "task-1", assignee_team_member_id: memberId })
                );
            });

            it("notifies the new assignee on reassignment", async () => {
                mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null, assignee_team_member_id: otherMemberId });

                await updateTask("host-1", "task-1", { assignee_team_member_id: memberId });

                expect(mockNotifyTaskAssigned).toHaveBeenCalledWith(
                    "host-1",
                    expect.objectContaining({ assignee_team_member_id: memberId })
                );
            });

            it("does not notify when the assignee is unchanged", async () => {
                mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null, assignee_team_member_id: memberId });

                await updateTask("host-1", "task-1", { assignee_team_member_id: memberId });

                expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
            });

            it("does not notify when the task is unassigned", async () => {
                mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null, assignee_team_member_id: memberId });

                await updateTask("host-1", "task-1", { assignee_team_member_id: null });

                expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
            });

            it("does not notify when the update does not touch the assignee", async () => {
                mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: null, assignee_team_member_id: memberId });

                await updateTask("host-1", "task-1", { priority: "High" });

                expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
            });

            it("does not notify when the update could not be saved", async () => {
                mockUpdateTaskInDb.mockRejectedValue(new Error("database down"));

                await expect(
                    updateTask("host-1", "task-1", { assignee_team_member_id: memberId })
                ).rejects.toThrow("database down");

                expect(mockNotifyTaskAssigned).not.toHaveBeenCalled();
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
                status: "active",
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
