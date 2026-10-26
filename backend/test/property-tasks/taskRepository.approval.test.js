import { approveCompletedTaskInDb, rejectCompletedTaskInDb } from "../../functions/property-tasks/data/taskRepository.js";
import { buildUpdateDataSource } from "./updateQueryBuilderDouble.js";

describe("approveCompletedTaskInDb", () => {
    it("records when the task was approved", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await approveCompletedTaskInDb(dataSource, "task-1", "host-1", 5000);

        expect(chain.set).toHaveBeenCalledWith({ approved_at: 5000 });
    });

    it("only changes this host's task, and only while it is completed and not yet approved", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await approveCompletedTaskInDb(dataSource, "task-1", "host-1", 5000);

        expect(chain.where).toHaveBeenCalledWith("id = :taskId", { taskId: "task-1" });
        expect(chain.andWhere).toHaveBeenCalledWith("host_id = :hostId", { hostId: "host-1" });
        expect(chain.andWhere).toHaveBeenCalledWith("status = :completed", { completed: "Completed" });
        expect(chain.andWhere).toHaveBeenCalledWith("approved_at IS NULL");
    });

    it("reports a win when exactly one row was changed, and a loss when nothing was", async () => {
        await expect(approveCompletedTaskInDb(buildUpdateDataSource(1).dataSource, "task-1", "host-1", 5000)).resolves.toBe(true);
        await expect(approveCompletedTaskInDb(buildUpdateDataSource(0).dataSource, "task-1", "host-1", 5000)).resolves.toBe(false);
    });
});

describe("rejectCompletedTaskInDb", () => {
    it("reopens the task as In progress and clears its completed date", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await rejectCompletedTaskInDb(dataSource, "task-1", "host-1", 5000);

        expect(chain.set).toHaveBeenCalledWith({ status: "In progress", completed_date: null, updated_at: 5000 });
    });

    it("only changes this host's task, and only while it is completed and not yet approved", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await rejectCompletedTaskInDb(dataSource, "task-1", "host-1", 5000);

        expect(chain.where).toHaveBeenCalledWith("id = :taskId", { taskId: "task-1" });
        expect(chain.andWhere).toHaveBeenCalledWith("host_id = :hostId", { hostId: "host-1" });
        expect(chain.andWhere).toHaveBeenCalledWith("status = :completed", { completed: "Completed" });
        expect(chain.andWhere).toHaveBeenCalledWith("approved_at IS NULL");
    });

    it("reports a win when exactly one row was changed, and a loss when nothing was", async () => {
        await expect(rejectCompletedTaskInDb(buildUpdateDataSource(1).dataSource, "task-1", "host-1", 5000)).resolves.toBe(true);
        await expect(rejectCompletedTaskInDb(buildUpdateDataSource(0).dataSource, "task-1", "host-1", 5000)).resolves.toBe(false);
    });
});
