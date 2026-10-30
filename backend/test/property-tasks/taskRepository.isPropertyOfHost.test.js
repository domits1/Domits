import { isPropertyOfHost } from "../../functions/property-tasks/data/taskRepository.js";
import { Property } from "database/models/Property";

const buildDataSource = (found) => {
    const findOne = jest.fn().mockResolvedValue(found);
    return { findOne, dataSource: { getRepository: jest.fn(() => ({ findOne })) } };
};

describe("isPropertyOfHost", () => {
    it("looks the property up by its id and the host together", async () => {
        const { findOne, dataSource } = buildDataSource({ id: "prop-1" });

        await expect(isPropertyOfHost(dataSource, "prop-1", "host-1")).resolves.toBe(true);

        expect(dataSource.getRepository).toHaveBeenCalledWith(Property);
        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "prop-1", hostid: "host-1" } }));
    });

    it("answers false when the host has no property with that id", async () => {
        const { dataSource } = buildDataSource(null);

        await expect(isPropertyOfHost(dataSource, "prop-1", "host-2")).resolves.toBe(false);
    });
});
