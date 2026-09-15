import {EntitySchema} from "typeorm";

export const PROPERTY_TECHNICAL_DETAILS_TABLE_NAMES = Object.freeze({
    current: "property_technicaldetails",
    canonical: "property_technical_details"
});

export const Property_Technical_Details = new EntitySchema({
    name: "Property_TechnicalDetails",
    tableName: PROPERTY_TECHNICAL_DETAILS_TABLE_NAMES.current,
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        fourwheeldrive: {
            type: "boolean",
            nullable: false
        },
        fuelconsumption: {
            type: "int",
            nullable: false
        },
        generalperiodicinspection: {
            type: "int",
            nullable: false
        },
        height: {
            type: "int",
            nullable: true
        },
        length: {
            type: "int",
            nullable: false
        },
        renovationyear: {
            type: "int",
            nullable: false
        },
        speed: {
            type: "int",
            nullable: false
        },
        transmission: {
            type: "varchar",
            nullable: false
        }
    }
})
