import { updateTaskUnlessCompleted } from "../../functions/property-tasks/data/taskRepository.js";
import { buildUpdateDataSource as buildDataSource } from "./queryBuilderDoubles.js";

describe("updateTaskUnlessCompleted", () => {
    it("writes the given fields to that task", async () => {
        const { dataSource, chain } = buildDataSource(1);

        await updateTaskUnlessCompleted(dataSource, "task-1", { status: "Completed", completed_date: 5000 });

        expect(chain.set).toHaveBeenCalledWith({ status: "Completed", completed_date: 5000 });
        expect(chain.where).toHaveBeenCalledWith("id = :taskId", { taskId: "task-1" });
    });

    it("only applies while the task is not completed yet, so a second request changes nothing", async () => {
        const { dataSource, chain } = buildDataSource(1);

        await updateTaskUnlessCompleted(dataSource, "task-1", { status: "Completed" });

        expect(chain.andWhere).toHaveBeenCalledWith("status <> :completed", { completed: "Completed" });
    });

    it("reports a win when exactly one row was changed", async () => {
        const { dataSource } = buildDataSource(1);

        await expect(updateTaskUnlessCompleted(dataSource, "task-1", { status: "Completed" })).resolves.toBe(true);
    });

    it("reports a loss when the task had already been completed by someone else", async () => {
        const { dataSource } = buildDataSource(0);

        await expect(updateTaskUnlessCompleted(dataSource, "task-1", { status: "Completed" })).resolves.toBe(false);
    });
});
