import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import Database from "../../ORM/index.js";
import { Property_Pricing } from "../../ORM/models/Property_Pricing";
import { Property_Type } from "../../ORM/models/Property_Type";
import { Property_Amenity } from "../../ORM/models/Property_Amenity";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const makeQueryBuilder = () => {
    const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    };
    return qb;
};

describe("PropertyRepository Filtering", () => {
    let repo;
    let mockQueryBuilder;

    beforeEach(() => {
        mockQueryBuilder = makeQueryBuilder();
        Database.getInstance.mockResolvedValue({
            getRepository: jest.fn().mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            }),
        });
        repo = new PropertyRepository({});
    });

    it("should filter by price range", async () => {
        const filters = { minPrice: 100, maxPrice: 500 };
        mockQueryBuilder.getMany.mockResolvedValue([{ id: "prop-1" }]);

        const result = await repo.getFilteredProperties(filters);

        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(Property_Pricing, "pp", "pp.property_id = property.id");
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("pp.roomrate >= :minPrice", { minPrice: 100 });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("pp.roomrate <= :maxPrice", { maxPrice: 500 });
        expect(result).toEqual(["prop-1"]);
    });

    it("should filter by property type", async () => {
        const filters = { type: "Apartment" };
        mockQueryBuilder.getMany.mockResolvedValue([{ id: "prop-2" }]);

        const result = await repo.getFilteredProperties(filters);

        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(Property_Type, "pt", "pt.property_id = property.id");
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("pt.type = :type", { type: "Apartment" });
        expect(result).toEqual(["prop-2"]);
    });

    it("should filter by facilities", async () => {
        const filters = { facilities: ["wifi", "parking"] };
        mockQueryBuilder.getMany.mockResolvedValue([{ id: "prop-3" }]);

        const result = await repo.getFilteredProperties(filters);

        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(Property_Amenity, "pa", "pa.property_id = property.id");
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("pa.amenityid IN (:...facilities)", { facilities: ["wifi", "parking"] });
        expect(result).toEqual(["prop-3"]);
    });

    it("should combine multiple filters", async () => {
        const filters = { minPrice: 100, type: "Villa" };
        mockQueryBuilder.getMany.mockResolvedValue([{ id: "prop-4" }]);

        const result = await repo.getFilteredProperties(filters);

        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(Property_Pricing, "pp", "pp.property_id = property.id");
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(Property_Type, "pt", "pt.property_id = property.id");
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("pp.roomrate >= :minPrice", { minPrice: 100 });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("pt.type = :type", { type: "Villa" });
        expect(result).toEqual(["prop-4"]);
    });
});
