import {EntitySchema} from "typeorm";

export const PROPERTY_AVAILABILITY_RESTRICTION_TABLE_NAMES = Object.freeze({
    current: "property_availabilityrestriction",
    canonical: "property_availability_restriction"
});

export const Property_Availability_Restriction = new EntitySchema({
    name: "Property_AvailabilityRestriction",
    tableName: PROPERTY_AVAILABILITY_RESTRICTION_TABLE_NAMES.current,
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        property_id: {
            type: "varchar",
            nullable: false
        },
        restriction: {
            type: "varchar",
            nullable: false
        },
        value: {
            type: "int",
            nullable: false
        },
    }
})
