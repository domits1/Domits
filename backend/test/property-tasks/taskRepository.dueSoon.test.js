import { getDueSoonTasksToNotify, claimDueSoonNotification } from "../../functions/property-tasks/data/taskRepository.js";
import { buildSelectDataSource, buildUpdateDataSource } from "./queryBuilderDoubles.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("getDueSoonTasksToNotify", () => {
    const conditions = (chain) =>
        [...chain.where.mock.calls, ...chain.andWhere.mock.calls].map(([sql]) => sql).join(" AND ");

    it("returns the tasks the query finds", async () => {
        const { dataSource } = buildSelectDataSource([{ id: "task-1" }]);

        await expect(getDueSoonTasksToNotify(dataSource, 5000, 20)).resolves.toEqual([{ id: "task-1" }]);
    });

    it("only selects open tasks due within the next day that are not legacy", async () => {
        const { dataSource, chain } = buildSelectDataSource([]);

        await getDueSoonTasksToNotify(dataSource, 5000, 20);

        const sql = conditions(chain);
        expect(sql).toContain("task.due_date > :now");
        expect(sql).toContain("task.due_date <= :until");
        expect(sql).toContain("task.status NOT IN (:...resolved)");
        expect(sql).toContain("task.is_legacy = false");
        expect(chain.where).toHaveBeenCalledWith("task.due_date > :now", { now: 5000 });
        expect(chain.andWhere).toHaveBeenCalledWith("task.due_date <= :until", { until: 5000 + DAY_MS });
        expect(chain.andWhere).toHaveBeenCalledWith(expect.any(String), { resolved: ["Completed", "Cancelled"] });
    });

    it("skips a task already emailed about its current due date, but not one whose due date moved since", async () => {
        const { dataSource, chain } = buildSelectDataSource([]);

        await getDueSoonTasksToNotify(dataSource, 5000, 20);

        expect(conditions(chain)).toContain(
            "(task.due_soon_notified_for IS NULL OR task.due_soon_notified_for <> task.due_date)"
        );
    });

    it("puts the tasks due soonest first, up to the limit", async () => {
        const { dataSource, chain } = buildSelectDataSource([]);

        await getDueSoonTasksToNotify(dataSource, 5000, 20);

        expect(chain.orderBy).toHaveBeenCalledWith("task.due_date", "ASC");
        expect(chain.limit).toHaveBeenCalledWith(20);
    });
});

describe("claimDueSoonNotification", () => {
    const task = { id: "task-1", due_date: 9000 };

    it("records the due date it is emailing about", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await claimDueSoonNotification(dataSource, task);

        expect(chain.set).toHaveBeenCalledWith({ due_soon_notified_for: 9000 });
        expect(chain.where).toHaveBeenCalledWith("id = :taskId", { taskId: "task-1" });
    });

    it("claims only while the due date is still the one that was read and has not been emailed about yet", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await claimDueSoonNotification(dataSource, task);

        expect(chain.andWhere).toHaveBeenCalledWith("due_date = :dueDate", { dueDate: 9000 });
        expect(chain.andWhere).toHaveBeenCalledWith(
            "(due_soon_notified_for IS NULL OR due_soon_notified_for <> :dueDate)",
            { dueDate: 9000 }
        );
    });

    it("reports a win when exactly one row was claimed", async () => {
        const { dataSource } = buildUpdateDataSource(1);

        await expect(claimDueSoonNotification(dataSource, task)).resolves.toBe(true);
    });

    it("reports a loss when another run claimed the task first, or its due date changed", async () => {
        const { dataSource } = buildUpdateDataSource(0);

        await expect(claimDueSoonNotification(dataSource, task)).resolves.toBe(false);
    });
});
