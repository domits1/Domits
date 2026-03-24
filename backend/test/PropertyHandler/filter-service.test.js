import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";

jest.mock("../../functions/PropertyHandler/data/repository/propertyRepository.js");

describe("PropertyService Filtering", () => {
    let service;
    let mockRepo;

    beforeEach(() => {
        mockRepo = new PropertyRepository();
        service = new PropertyService();
        service.propertyRepository = mockRepo;
    });

    it("should fetch and map filtered properties", async () => {
        const filters = { minPrice: 100 };
        const mockIdentifiers = ["prop-1", "prop-2"];
        mockRepo.getFilteredProperties.mockResolvedValue(mockIdentifiers);
        
        // Mocking getCardPropertyAttributes to return simple objects
        service.getCardPropertyAttributes = jest.fn((id) => Promise.resolve({ id }));

        const result = await service.getFilteredPropertyCards(filters);

        expect(mockRepo.getFilteredProperties).toHaveBeenCalledWith(filters);
        expect(service.getCardPropertyAttributes).toHaveBeenCalledTimes(2);
        expect(result).toEqual([{ id: "prop-1" }, { id: "prop-2" }]);
    });
});
