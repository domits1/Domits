import {EntitySchema} from "typeorm";

export const Property_Technical_Details = new EntitySchema({
    name: "Property_TechnicalDetails",
    tableName: "property_technicaldetails",
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