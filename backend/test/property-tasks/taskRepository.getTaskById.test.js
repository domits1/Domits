import { getTaskById } from "../../functions/property-tasks/data/taskRepository.js";
import { PropertyTask } from "database/models/Property_Task";

describe("getTaskById", () => {
    it("only finds the task when it belongs to the given host", async () => {
        const findOne = jest.fn().mockResolvedValue({ id: "task-1", host_id: "host-1" });
        const dataSource = { getRepository: jest.fn(() => ({ findOne })) };

        await expect(getTaskById(dataSource, "task-1", "host-1")).resolves.toEqual({ id: "task-1", host_id: "host-1" });

        expect(dataSource.getRepository).toHaveBeenCalledWith(PropertyTask);
        expect(findOne).toHaveBeenCalledWith({ where: { id: "task-1", host_id: "host-1" } });
    });
});
