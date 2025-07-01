import {PropertyBuilder} from "../../functions/PropertyHandler/business/service/propertyBuilder.js";
import fc from "fast-check";
import {describe, it, expect} from "@jest/globals";

function makeBuilderWithProperty() {
    const builder = new PropertyBuilder();
    builder.property = { id: 'Test1' };
    return builder;
}

describe('PropertyBuilder addPricing', () => {
    const validInput = fc.record({
        roomRate: fc.float({ min: 2 }).filter(n => !Number.isNaN(n)),
        cleaning: fc.float({ min: 0 }).filter(n => !Number.isNaN(n)),
    });

    const invalidLowInput = fc.record({
        roomRate: fc.float({ max: Math.fround(-1) }).filter(n => !Number.isNaN(n)),
        cleaning: fc.float({ min: 0 }).filter(n => !Number.isNaN(n)),
    });

    const invalidMissingInput = fc.record({
        roomRate: fc.float({ min: 2 }).filter(n => !Number.isNaN(n))
    });

    it('should accept valid pricing inputs and set propertyPricing', () => {
        fc.assert(
            fc.property(validInput, (input) => {
                const builder = makeBuilderWithProperty();
                const result = builder.addPricing(input);

                return (
                    result.propertyPricing.roomRate >= 2 &&
                    result.propertyPricing.cleaning >= 0
                );
            })
        );
    });

    it('should throw if any price is less than 0', () => {
        fc.assert(
            fc.property(invalidLowInput, (input) => {
                const builder = makeBuilderWithProperty();
                expect(() => builder.addPricing(input)).toThrow();
            })
        );
    });

    it('should set price of cleaning to 0 if this is missing or falsy', () => {
        fc.assert(
            fc.property(invalidMissingInput, (input) => {
                const builder = makeBuilderWithProperty();
                const result = builder.addPricing(input);

                return (
                    result.propertyPricing.roomRate >= 2 &&
                    result.propertyPricing.cleaning === 0
                );
            })
        );
    });
});
