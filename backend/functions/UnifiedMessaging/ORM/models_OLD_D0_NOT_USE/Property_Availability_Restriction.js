import {EntitySchema} from "typeorm";

export const Property_Availability_Restriction = new EntitySchema({
    name: "Property_AvailabilityRestriction",
    tableName: "property_availabilityrestriction",
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