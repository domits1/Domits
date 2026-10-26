import { getOverdueTasksToNotify, claimOverdueNotification } from "../../functions/property-tasks/data/taskRepository.js";
import { buildUpdateDataSource } from "./updateQueryBuilderDouble.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("getOverdueTasksToNotify", () => {
    const buildDataSource = (tasks) => {
        const chain = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(tasks),
        };
        return { chain, dataSource: { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) } };
    };

    const conditions = (chain) =>
        [...chain.where.mock.calls, ...chain.andWhere.mock.calls].map(([sql]) => sql).join(" AND ");

    const emailRule = (chain) =>
        chain.andWhere.mock.calls.find(([sql]) => sql.includes("overdue_last_notified_at IS NULL"));

    it("returns the tasks the query finds", async () => {
        const { dataSource } = buildDataSource([{ id: "task-1" }]);

        await expect(getOverdueTasksToNotify(dataSource, 5000, 20)).resolves.toEqual([{ id: "task-1" }]);
    });

    it("only selects open, past-due tasks that are not escalated and not legacy", async () => {
        const { dataSource, chain } = buildDataSource([]);

        await getOverdueTasksToNotify(dataSource, 5000, 20);

        const sql = conditions(chain);
        expect(sql).toContain("task.due_date < :now");
        expect(sql).toContain("task.status NOT IN (:...resolved)");
        expect(sql).toContain("task.escalated_at IS NULL");
        expect(sql).toContain("task.is_legacy = false");
        expect(chain.andWhere).toHaveBeenCalledWith(expect.any(String), { resolved: ["Completed", "Cancelled"] });
    });

    it("sends the first email only to tasks that went overdue within the last day", async () => {
        const { dataSource, chain } = buildDataSource([]);

        await getOverdueTasksToNotify(dataSource, 10 * DAY_MS, 20);

        const [sql, params] = emailRule(chain);
        expect(sql).toContain("task.overdue_last_notified_at IS NULL AND task.due_date >= :since");
        expect(params.since).toBe(9 * DAY_MS);
    });

    it("sends a reminder two days after the last email, until the cap is reached", async () => {
        const { dataSource, chain } = buildDataSource([]);

        await getOverdueTasksToNotify(dataSource, 10 * DAY_MS, 20);

        const [sql, params] = emailRule(chain);
        expect(sql).toContain("task.overdue_last_notified_at <= :remindBefore");
        expect(sql).toContain("COALESCE(task.overdue_notify_count, 0) < :maxNotifications");
        expect(params.remindBefore).toBe(8 * DAY_MS);
        expect(params.maxNotifications).toBe(4);
    });

    it("puts tasks that have not been emailed yet first, then the longest-waiting reminders", async () => {
        const { dataSource, chain } = buildDataSource([]);

        await getOverdueTasksToNotify(dataSource, 5000, 20);

        expect(chain.orderBy).toHaveBeenCalledWith("task.overdue_last_notified_at", "ASC", "NULLS FIRST");
        expect(chain.limit).toHaveBeenCalledWith(20);
    });
});

describe("claimOverdueNotification", () => {
    it("stamps the time and adds one to the count", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await claimOverdueNotification(dataSource, { id: "task-1", overdue_last_notified_at: null }, 5000);

        const values = chain.set.mock.calls[0][0];
        expect(values.overdue_last_notified_at).toBe(5000);
        expect(values.overdue_notify_count()).toBe("COALESCE(overdue_notify_count, 0) + 1");
        expect(chain.where).toHaveBeenCalledWith("id = :taskId", { taskId: "task-1" });
    });

    it("claims a first email only while the task has still never been emailed", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await claimOverdueNotification(dataSource, { id: "task-1", overdue_last_notified_at: null }, 5000);

        expect(chain.andWhere).toHaveBeenCalledWith("overdue_last_notified_at IS NULL");
    });

    it("claims a reminder only while the last email time is still the one that was read", async () => {
        const { dataSource, chain } = buildUpdateDataSource(1);

        await claimOverdueNotification(dataSource, { id: "task-1", overdue_last_notified_at: 1000 }, 5000);

        expect(chain.andWhere).toHaveBeenCalledWith("overdue_last_notified_at = :previous", { previous: 1000 });
    });

    it("reports a win when exactly one row was claimed", async () => {
        const { dataSource } = buildUpdateDataSource(1);

        await expect(claimOverdueNotification(dataSource, { id: "task-1" }, 5000)).resolves.toBe(true);
    });

    it("reports a loss when another run claimed the task first", async () => {
        const { dataSource } = buildUpdateDataSource(0);

        await expect(claimOverdueNotification(dataSource, { id: "task-1" }, 5000)).resolves.toBe(false);
    });
});
