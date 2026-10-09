import { getTasksFromDb } from "../../functions/property-tasks/data/taskRepository.js";

describe("getTasksFromDb overdue rewrite", () => {
    const buildChain = (tasks) => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(tasks),
    });

    const mockDataSource = (tasks) => {
        const chain = buildChain(tasks);
        return {
            getRepository: jest.fn(() => ({
                createQueryBuilder: jest.fn(() => chain),
            })),
        };
    };

    it("does not relabel a Cancelled task as Overdue even if its due_date has passed", async () => {
        const now = Date.now();
        const dataSource = mockDataSource([
            { id: "task-1", status: "Cancelled", due_date: now - 1000 },
        ]);

        const result = await getTasksFromDb(dataSource, "host-1", {});

        expect(result[0].status).toBe("Cancelled");
    });

    it("still relabels an open, overdue task as Overdue", async () => {
        const now = Date.now();
        const dataSource = mockDataSource([
            { id: "task-1", status: "Pending", due_date: now - 1000 },
        ]);

        const result = await getTasksFromDb(dataSource, "host-1", {});

        expect(result[0].status).toBe("Overdue");
        expect(result[0].priority).toBe("Urgent");
    });

    it("does not relabel a Completed task as Overdue", async () => {
        const now = Date.now();
        const dataSource = mockDataSource([
            { id: "task-1", status: "Completed", due_date: now - 1000 },
        ]);

        const result = await getTasksFromDb(dataSource, "host-1", {});

        expect(result[0].status).toBe("Completed");
    });
});
